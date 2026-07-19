import asyncio
import re
import hashlib
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

    def _extract_handles_from_metadata(self, metadata: dict) -> Dict[str, str]:
        """
        Phase 2: Parses profile JSON values using Regex to find explicit links to other platforms.
        """
        extracted = {}
        metadata_str = str(metadata).lower()
        
        # Advanced Regex patterns covering modern variations
        github_match = re.search(r'(?:github\.com/|@github/)([a-zA-Z0-9-]+)', metadata_str)
        if github_match:
            extracted["github"] = github_match.group(1)
            
        so_match = re.search(r'stackoverflow\.com/users/(\d+)', metadata_str)
        if so_match:
            extracted["stackoverflow"] = so_match.group(1)
            
        devto_match = re.search(r'(?:dev\.to/|dev\.to/@)([a-zA-Z0-9_-]+)', metadata_str)
        if devto_match:
            extracted["devto"] = devto_match.group(1)
            
        hn_match = re.search(r'news\.ycombinator\.com/user\?id=([a-zA-Z0-9_-]+)', metadata_str)
        if hn_match:
            extracted["hackernews"] = hn_match.group(1)
            
        return extracted

    async def resolve_and_store(self, name: str, handles: dict, user_metadata: dict = None) -> Dict[str, Any]:
        """
        Executes the Iterative Graph Crawler & LLM Tiebreaker resolution pipeline.
        Returns Canonical ID or 300 Multiple Choices if disambiguation is needed.
        """
        start_time = asyncio.get_event_loop().time()
        
        fetched_profiles = {}
        canonical_id = None

        if not handles:
            handles = {}

        # Phase 0: Cache Check
        for platform, handle in handles.items():
            cached_id = self.db.find_canonical_by_handle(platform, handle)
            if cached_id:
                tracker.record_resolution_time((asyncio.get_event_loop().time() - start_time) * 1000)
                return {"status": "success", "canonical_id": cached_id}

        # Phase 1a: Name-Only Short Circuit
        if not handles and name:
            query_str = f"{name.lower()}|{str(user_metadata).lower() if user_metadata else ''}"
            query_hash = hashlib.md5(query_str.encode()).hexdigest()
            
            cached_candidates = self.db.get_search_cache(query_hash)
            if cached_candidates:
                tracker.record_resolution_time((asyncio.get_event_loop().time() - start_time) * 1000)
                return {
                    "status": "multiple_choices",
                    "canonical_id": None,
                    "message": "Name-only search requires human verification. Please select the correct profile.",
                    "candidates": cached_candidates
                }

            # We must fetch top candidates and return 300 Multiple Choices to force HITL Anchor selection.
            candidates = []
            results = await asyncio.gather(
                self.fetchers["github"].search_by_name(name),
                self.fetchers["stackoverflow"].search_by_name(name)
            )
            for platform_name, plat_res in zip(["github", "stackoverflow"], results):
                for c in plat_res:
                    match_score = 0
                    if user_metadata:
                        # Heuristically check if metadata strings exist in the raw JSON payload
                        raw_text = str(c).lower()
                        if user_metadata.get("location") and user_metadata["location"].lower() in raw_text:
                            match_score += 1
                        if user_metadata.get("workplace") and user_metadata["workplace"].lower() in raw_text:
                            match_score += 1
                        
                    candidates.append({
                        "platform": platform_name, 
                        "handle": c.get("handle", "unknown"), 
                        "match_score": match_score,
                        "data": c
                    })
                
            if not candidates:
                return {
                    "status": "error",
                    "canonical_id": None,
                    "message": f"No candidates found for the name '{name}' across primary platforms."
                }
                
            # Sort candidates by match_score descending
            candidates.sort(key=lambda x: x["match_score"], reverse=True)
            
            self.db.save_search_cache(query_hash, candidates)
                
            return {
                "status": "multiple_choices",
                "canonical_id": None,
                "message": "Name-only search requires human verification. Please select the correct profile.",
                "candidates": candidates
            }

        # Phase 2: Iterative Graph Crawler Loop (max 3 iterations)
        current_handles = handles.copy()
        fetched_profiles = {}  # platform -> raw_data dict
        iteration = 0
        max_iterations = 3
        
        while iteration < max_iterations:
            iteration += 1
            new_handles_discovered = False
            tasks = []
            platforms_to_fetch = []
            
            for platform, handle in current_handles.items():
                if platform not in fetched_profiles:
                    # Fix Flaw B: Synchronous DB call in async loop
                    cached_data = await asyncio.to_thread(self.db.get_raw_profile, platform, handle)
                    if cached_data:
                        async def return_cached(data): return data
                        tasks.append(return_cached(cached_data))
                    else:
                        tasks.append(self.fetchers[platform].fetch_by_handle(handle))
                    platforms_to_fetch.append(platform)
            
            if not tasks:
                break # No new platforms to fetch
                
            results = await asyncio.gather(*tasks)
            
            for platform, data in zip(platforms_to_fetch, results):
                if data:
                    fetched_profiles[platform] = data
                    extracted = self._extract_handles_from_metadata(data)
                    for ext_plat, ext_handle in extracted.items():
                        if ext_plat not in current_handles:
                            current_handles[ext_plat] = ext_handle
                            new_handles_discovered = True
                            
            if not new_handles_discovered:
                break

        if not fetched_profiles:
             return {"status": "error", "message": "No data found across any platforms."}

        # Store all fetched profiles as Raw Profiles
        raw_ids = {}
        for platform, data in fetched_profiles.items():
            raw_ids[platform] = self.db.insert_raw_profile(platform, data.get("handle", "unknown"), data)

        # Create Canonical Entity Container
        base_platform = list(fetched_profiles.keys())[0]
        # Try to extract a real name from the platform's profile data
        extracted_name = fetched_profiles[base_platform].get("profile", {}).get("name")
        canonical_name = name or extracted_name or fetched_profiles[base_platform].get("handle", "Unknown User")
        canonical_id = self.db.create_canonical_entity(canonical_name)

        # Phase 3a: Deterministic Graph Resolution
        for platform, raw_id in raw_ids.items():
            reason = "explicit_handle" if platform in handles else "graph_traversal_extraction"
            self.db.link_profile(canonical_id, raw_id, 1.0, reason, "confirmed")

        # Phase 3b: Fallback Name Search for missing orphans
        ambiguous_matches = []
        missing_platforms = [p for p in ["github", "stackoverflow", "devto", "hackernews"] if p not in fetched_profiles]
        if missing_platforms and name:
            fallback_tasks = [self.fetchers[p].search_by_name(name) for p in missing_platforms]
            fallback_results = await asyncio.gather(*fallback_tasks)
            
            base_data = fetched_profiles[base_platform]
            
            for platform, candidates in zip(missing_platforms, fallback_results):
                for candidate_data in candidates:
                    cand_handle = candidate_data.get("handle", "unknown")
                    raw_id = self.db.insert_raw_profile(platform, cand_handle, candidate_data)
                    
                    # LLM Tiebreaker
                    is_match, conf, reason_text, tokens = self.llm.tiebreaker_resolution(base_data, candidate_data, user_metadata)
                    tracker.record_llm_usage(tokens)
                    
                    if len(reason_text) > 250:
                        reason_text = reason_text[:247] + "..."
                        
                    if conf >= 0.85:
                        self.db.link_profile(canonical_id, raw_id, conf, reason_text, "confirmed")
                        fetched_profiles[platform] = candidate_data
                        break # Stop checking other candidates for this platform
                    elif conf >= 0.5:
                        self.db.link_profile(canonical_id, raw_id, conf, reason_text, "pending_review")
                        ambiguous_matches.append({
                            "platform": platform,
                            "handle": cand_handle,
                            "confidence": conf,
                            "reason": reason_text,
                            "raw_id": raw_id
                        })
                    else:
                        self.db.link_profile(canonical_id, raw_id, conf, reason_text, "rejected")

        # Generate LLM Summary based on confirmed links
        final_profile = self.db.get_full_canonical_profile(canonical_id)
        if final_profile:
            summary_text, tokens = self.llm.generate_summary(str(final_profile))
            tracker.record_llm_usage(tokens)
            self.db.update_canonical_summary(canonical_id, summary_text)

        end_time = asyncio.get_event_loop().time()
        tracker.record_resolution_time((end_time - start_time) * 1000)

        if ambiguous_matches:
            return {
                "status": "multiple_choices",
                "canonical_id": canonical_id,
                "message": "Graph traversal succeeded, but some missing platforms required LLM fallback and are pending review.",
                "ambiguous_matches": ambiguous_matches
            }

        return {
            "status": "success",
            "canonical_id": canonical_id
        }
