import asyncio
import re
import hashlib
from typing import Dict, Any, List
from src.core.supabase_client import SupabaseDB
from src.llm.summarizer import LLMService, LLMConfigurationError
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

    async def resolve_and_store(self, name: str, handles: dict, user_metadata: dict = None, mode: str = 'transparent', depth: str = 'normal') -> Dict[str, Any]:
        """
        Executes the Iterative Graph Crawler & LLM Tiebreaker resolution pipeline.
        Returns Canonical ID or 300 Multiple Choices if disambiguation is needed.
        """
        start_time = asyncio.get_event_loop().time()
        
        fetched_profiles = {}
        canonical_id = None
        resolution_warnings = []

        if not handles:
            handles = {}

        # Phase 0: Cache Check
        existing_canonical_id = None
        for platform, handle in handles.items():
            cached_id = await asyncio.to_thread(self.db.find_canonical_by_handle, platform, handle)
            if cached_id:
                existing_canonical_id = cached_id
                break

        if existing_canonical_id:
            profile = await asyncio.to_thread(self.db.get_full_canonical_profile, existing_canonical_id)
            
            # Check if all explicitly requested handles are already linked to this canonical profile
            existing_platforms = {}
            if profile and "entity_links" in profile:
                for link in profile["entity_links"]:
                    if link.get("status") == "confirmed" and "raw_profiles" in link:
                        p = link["raw_profiles"]["platform"]
                        h = link["raw_profiles"]["handle"]
                        existing_platforms[p] = h

            missing_explicit_handles = {}
            for p, h in handles.items():
                if p not in existing_platforms or existing_platforms[p] != h:
                    missing_explicit_handles[p] = h

            if not missing_explicit_handles:
                # All handles are already linked! We can safely short-circuit.
                if profile and not profile.get("llm_summary"):
                    summary_text, tokens = await self.llm.generate_summary(str(profile))
                    tracker.record_llm_usage(tokens)
                    await asyncio.to_thread(self.db.update_canonical_summary, existing_canonical_id, summary_text)
                    
                tracker.record_resolution_time((asyncio.get_event_loop().time() - start_time) * 1000)
                return {"status": "success", "canonical_id": existing_canonical_id}
            else:
                # New explicit handles were provided! We must NOT short circuit.
                # Save the existing canonical_id so we can link the new profiles to it in Phase 2.
                canonical_id = existing_canonical_id

        # Phase 1: Disambiguation & Smart Caching
        if not handles and name:
            query_str = f"{name.lower()}|{str(user_metadata).lower() if user_metadata else ''}"
            query_hash = hashlib.md5(query_str.encode()).hexdigest()
            
            cached_candidates = await asyncio.to_thread(self.db.get_search_cache, query_hash)
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
                self.fetchers["stackoverflow"].search_by_name(name),
                self.fetchers["devto"].search_by_name(name),
                self.fetchers["hackernews"].search_by_name(name),
                return_exceptions=True
            )
            for platform_name, plat_res in zip(["github", "stackoverflow", "devto", "hackernews"], results):
                if isinstance(plat_res, Exception):
                    resolution_warnings.append(f"{platform_name} Phase 1 failed: {str(plat_res)}")
                    continue
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
            
            await asyncio.to_thread(self.db.save_search_cache, query_hash, candidates)
                
            if mode == 'autonomous' and candidates:
                # Auto-select highest scored candidate and skip human verification
                top_cand = candidates[0]
                handles[top_cand["platform"]] = top_cand["handle"]
            else:
                return {
                    "status": "multiple_choices",
                    "canonical_id": None,
                    "message": "Name-only search requires human verification. Please select the correct profile.",
                    "candidates": candidates
                }

        # Phase 2: Iterative Graph Crawler Loop (max 3 iterations)
        current_handles = handles.copy()
        fetched_profiles = {}  # platform -> raw_data dict
        failed_platforms = set()
        iteration = 0
        depth_map = {'lighter': 1, 'normal': 3, 'deeper': 5}
        max_iterations = depth_map.get(depth, 3)
        
        while iteration < max_iterations:
            iteration += 1
            new_handles_discovered = False
            tasks = []
            platforms_to_fetch = []
            
            for platform, handle in current_handles.items():
                if platform not in fetched_profiles and platform not in failed_platforms:
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
                
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for platform, data in zip(platforms_to_fetch, results):
                if isinstance(data, Exception):
                    resolution_warnings.append(f"{platform} Phase 2 failed: {str(data)}")
                    failed_platforms.add(platform)
                    continue
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
            raw_ids[platform] = await asyncio.to_thread(self.db.insert_raw_profile, platform, data.get("handle", "unknown"), data)

        # Create Canonical Entity Container if it doesn't already exist
        if not canonical_id:
            base_platform = list(fetched_profiles.keys())[0]
            # Try to extract a real name from the platform's profile data
            extracted_name = fetched_profiles[base_platform].get("profile", {}).get("name")
            canonical_name = name or extracted_name or fetched_profiles[base_platform].get("handle", "Unknown User")
            canonical_id = await asyncio.to_thread(self.db.create_canonical_entity, canonical_name)

        # Bind Graph Handles (End of Phase 2)
        for platform, raw_id in raw_ids.items():
            reason = "explicit_handle" if platform in handles else "graph_traversal_extraction"
            await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, 1.0, reason, "confirmed")

        # Phase 3: LLM Tiebreaker (Heuristic Fallback)
        ambiguous_matches = []
        missing_platforms = [p for p in ["github", "stackoverflow", "devto", "hackernews"] if p not in fetched_profiles]
        if missing_platforms and name:
            fallback_tasks = [self.fetchers[p].search_by_name(name) for p in missing_platforms]
            fallback_results = await asyncio.gather(*fallback_tasks, return_exceptions=True)
            
            base_data = fetched_profiles[base_platform]
            
            for platform, candidates in zip(missing_platforms, fallback_results):
                if isinstance(candidates, Exception):
                    resolution_warnings.append(f"{platform} Phase 3 failed: {str(candidates)}")
                    continue
                for candidate_data in candidates:
                    cand_handle = candidate_data.get("handle", "unknown")
                    raw_id = await asyncio.to_thread(self.db.insert_raw_profile, platform, cand_handle, candidate_data)
                    
                    # LLM Tiebreaker
                    try:
                        is_match, conf, reason_text, tokens = await self.llm.tiebreaker_resolution(base_data, candidate_data, user_metadata)
                        tracker.record_llm_usage(tokens)
                    except LLMConfigurationError as e:
                        resolution_warnings.append(str(e))
                        is_match, conf = False, 0.0
                        reason_text = "LLM tiebreaker unavailable - requires manual review"
                    
                    if len(reason_text) > 250:
                        reason_text = reason_text[:247] + "..."
                        
                    if mode == 'autonomous' and conf >= 0.85:
                        await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, conf, reason_text, "confirmed")
                        fetched_profiles[platform] = candidate_data
                        break # Stop checking other candidates for this platform
                    else:
                        link_status = "pending_review" if conf >= 0.5 or not self.llm.client else "rejected"
                        if reason_text == "LLM tiebreaker unavailable - requires manual review":
                            link_status = "pending_review"
                        await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, conf, reason_text, link_status)
                        if conf >= 0.5:
                            ambiguous_matches.append({
                                "platform": platform,
                                "handle": cand_handle,
                                "confidence": conf,
                                "reason": reason_text,
                                "raw_id": raw_id,
                                "data": candidate_data,
                                "match_score": 0 # For frontend compatibility
                            })

        # Generate LLM Summary based on confirmed links
        final_profile = await asyncio.to_thread(self.db.get_full_canonical_profile, canonical_id)
        if final_profile:
            summary_text, tokens = await self.llm.generate_summary(str(final_profile))
            tracker.record_llm_usage(tokens)
            await asyncio.to_thread(self.db.update_canonical_summary, canonical_id, summary_text)

        end_time = asyncio.get_event_loop().time()
        tracker.record_resolution_time((end_time - start_time) * 1000)

        if ambiguous_matches:
            return {
                "status": "multiple_choices",
                "canonical_id": canonical_id,
                "message": f"Graph traversal succeeded, but we found {len(ambiguous_matches)} potential matches via LLM Fallback Search. Please review and manually select one.",
                "ambiguous_matches": ambiguous_matches,
                "warnings": resolution_warnings
            }

        return {
            "status": "success",
            "canonical_id": canonical_id,
            "warnings": resolution_warnings
        }
