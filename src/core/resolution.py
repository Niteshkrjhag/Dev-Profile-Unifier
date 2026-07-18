import asyncio
from typing import Dict, Any, List
from src.core.supabase_client import SupabaseDB
from src.llm.summarizer import LLMService
from src.core.observability import tracker

from src.fetchers.github import GithubFetcher
from src.fetchers.stackoverflow import StackOverflowFetcher
from src.fetchers.devto import DevToFetcher
from src.fetchers.hackernews import HackerNewsFetcher

class ProfileResolver:
    def __init__(self):
        self.db = SupabaseDB()
        self.llm = LLMService()
        self.fetchers = {
            "github": GithubFetcher(),
            "stackoverflow": StackOverflowFetcher(),
            "devto": DevToFetcher(),
            "hackernews": HackerNewsFetcher()
        }

    async def _fetch_all(self, name: str, specific_handles: dict) -> Dict[str, dict]:
        """Fetches data from all platforms concurrently."""
        tasks = []
        platforms = ["github", "stackoverflow", "devto", "hackernews"]
        
        async def fetch_platform(platform):
            tracker.record_api_call(platform)
            fetcher = self.fetchers[platform]
            handle = specific_handles.get(platform)
            if handle:
                return platform, await fetcher.fetch_by_handle(handle)
            elif name:
                # Fallback to name search
                return platform, await fetcher.search_by_name(name)
            return platform, {}

        results = await asyncio.gather(*(fetch_platform(p) for p in platforms))
        return {p: data for p, data in results if data}

    async def resolve_and_store(self, name: str, handles: dict) -> Dict[str, Any]:
        """
        Executes the resolution pipeline.
        Returns Canonical ID or 300 Multiple Choices if disambiguation is needed.
        """
        start_time = asyncio.get_event_loop().time()
        
        # 1. Fetch raw data concurrently
        raw_results = await self._fetch_all(name, handles)
        
        # 2. Store all raw results in Supabase
        raw_ids = {}
        for platform, data in raw_results.items():
            if data:
                raw_ids[platform] = self.db.insert_raw_profile(platform, data.get("handle", "unknown"), data)
        
        if not raw_ids:
            return {"status": "error", "message": "No data found across any platforms."}

        # 3. Create a canonical entity container
        canonical_name = name or list(raw_results.values())[0].get("handle", "Unknown User")
        canonical_id = self.db.create_canonical_entity(canonical_name)

        # 4. Tiered Resolution Logic
        # Because we only have limited data in this payload, we will demonstrate the LLM Tiebreaker logic.
        # In a full production system, we'd compare the previously stored raw profiles against the newly fetched ones.
        
        base_platform = "github" if "github" in raw_ids else list(raw_ids.keys())[0]
        base_raw_id = raw_ids[base_platform]
        base_data = raw_results[base_platform]
        
        # The base platform is trusted as the anchor (Score 1.0)
        self.db.link_profile(canonical_id, base_raw_id, 1.0, "anchor_profile", "confirmed")
        
        ambiguous_matches = []
        
        for platform, raw_id in raw_ids.items():
            if platform == base_platform:
                continue
                
            compare_data = raw_results[platform]
            
            # Tier 1 & 2: Exact Handle Match from user input
            if handles.get(platform) and handles.get(platform) == compare_data.get("handle"):
                self.db.link_profile(canonical_id, raw_id, 1.0, "exact_handle", "confirmed")
                continue
                
            # Tier 4: LLM Tiebreaker for everything else
            is_match, conf, reason, tokens = self.llm.tiebreaker_resolution(base_data, compare_data)
            tracker.record_llm_usage(tokens)
            
            # Truncate reason to fit varchar(255) schema
            if len(reason) > 250:
                reason = reason[:247] + "..."
            
            if conf >= 0.85:
                self.db.link_profile(canonical_id, raw_id, conf, reason, "confirmed")
            elif conf >= 0.5:
                # Approach 2: Multiple Choices / HITL
                self.db.link_profile(canonical_id, raw_id, conf, reason, "pending_review")
                ambiguous_matches.append({
                    "platform": platform,
                    "handle": compare_data.get("handle"),
                    "confidence": conf,
                    "reason": reason,
                    "raw_id": raw_id
                })
            else:
                self.db.link_profile(canonical_id, raw_id, conf, reason, "rejected")

        # 5. Generate LLM Summary based on confirmed links
        final_profile = self.db.get_full_canonical_profile(canonical_id)
        if final_profile:
            summary_text, tokens = self.llm.generate_summary(str(final_profile))
            tracker.record_llm_usage(tokens)
            self.db.update_canonical_summary(canonical_id, summary_text)

        end_time = asyncio.get_event_loop().time()
        tracker.record_resolution_time((end_time - start_time) * 1000)

        # 6. Evaluate if we need to return a Disambiguation Response (300 Multiple Choices)
        if ambiguous_matches:
            return {
                "status": "multiple_choices",
                "canonical_id": canonical_id,
                "message": "Some profiles matched ambiguously. Please manually resolve.",
                "ambiguous_matches": ambiguous_matches
            }

        return {
            "status": "success",
            "canonical_id": canonical_id
        }
