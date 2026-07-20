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

    def _extract_ngrams(self, text: str) -> set:
        words = re.findall(r'\b\w+\b', text.lower())
        ngrams = set(words)
        for i in range(len(words) - 1):
            ngrams.add(f"{words[i]} {words[i+1]}")
        for i in range(len(words) - 2):
            ngrams.add(f"{words[i]} {words[i+1]} {words[i+2]}")
        return ngrams

    def _rank_and_filter_candidates(self, base_data: dict, candidates: list, limit: int = 5) -> list:
        if not candidates or len(candidates) <= limit:
            return candidates
            
        base_text = " ".join([
            str(base_data.get("profile", {}).get("bio", "")),
            str(base_data.get("profile", {}).get("location", "")),
            str(base_data.get("profile", {}).get("company", "")),
            str(base_data.get("profile", {}).get("name", "")),
            " ".join(base_data.get("tags", [])),
            " ".join(base_data.get("top_technologies", []))
        ])
        
        base_ngrams = self._extract_ngrams(base_text)
        
        for cand in candidates:
            cand_text = " ".join([
                str(cand.get("profile", {}).get("bio", "")),
                str(cand.get("profile", {}).get("location", "")),
                str(cand.get("profile", {}).get("company", "")),
                str(cand.get("profile", {}).get("name", "")),
                " ".join(cand.get("tags", [])),
                " ".join(cand.get("top_technologies", []))
            ])
            cand_ngrams = self._extract_ngrams(cand_text)
            
            # Use overlap size as the match score
            cand["match_score"] = len(base_ngrams.intersection(cand_ngrams))
            
        candidates.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return candidates[:limit]

    async def resolve_and_store(self, name: str, handles: dict, user_metadata: dict = None, mode: str = 'transparent', depth: str = 'normal', fallback_disambiguation: bool = False) -> Dict[str, Any]:
        """
        Executes the Iterative Graph Crawler & LLM Tiebreaker resolution pipeline.
        Returns the unified canonical entity ID.
        """
        tracker.record_resolution_time(0) # initialize
        start_time = asyncio.get_event_loop().time()
        resolution_warnings = []
        
        # FEATURE: Testing/Debugging Dashboard
        # We capture intermediate raw and filtered data here to expose to the frontend Testing Tab
        debug_data = {
            "phase_1_raw": {},
            "phase_3_raw": {},
            "phase_3_llm_input": {}
        }
        
        canonical_id = None
        
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
                    debug_data["phase_1_raw"][platform_name] = []
                    continue
                debug_data["phase_1_raw"][platform_name] = plat_res
                for c in plat_res:
                    c["platform"] = platform_name
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
                # Use LLM to tiebreak without anchor on top 5 candidates
                top_candidates = candidates[:5]
                best_idx, conf, reason, tokens = await self.llm.evaluate_candidates_without_anchor(name, user_metadata, top_candidates)
                tracker.record_llm_usage(tokens)
                
                if best_idx != -1 and 0 <= best_idx < len(top_candidates) and conf >= 0.85:
                    top_cand = top_candidates[best_idx]
                    handles[top_cand["platform"]] = top_cand["handle"]
                else:
                    return {
                        "status": "multiple_choices",
                        "canonical_id": None,
                        "message": "Autonomous Mode: AI could not confidently determine a match. Do you want to manually approach this one?",
                        "candidates": candidates
                    }
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

        base_platform = list(fetched_profiles.keys())[0]

        # Create Canonical Entity Container if it doesn't already exist
        if not canonical_id:
            # Try to extract a real name from the platform's profile data
            extracted_name = fetched_profiles[base_platform].get("profile", {}).get("name")
            canonical_name = name or extracted_name or fetched_profiles[base_platform].get("handle", "Unknown User")
            canonical_id = await asyncio.to_thread(self.db.create_canonical_entity, canonical_name)

        # Bind Graph Handles (End of Phase 2)
        for platform, raw_id in raw_ids.items():
            reason = "explicit_handle" if platform in handles else "graph_traversal_extraction"
            await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, 1.0, reason, "confirmed")
            await asyncio.to_thread(self.db.reject_other_links_for_platform, canonical_id, platform, raw_id)

        # Phase 3: LLM Tiebreaker (Heuristic Fallback)
        ambiguous_matches = []
        missing_platforms = [p for p in ["github", "stackoverflow", "devto", "hackernews"] if p not in fetched_profiles]
        
        # FEATURE: Engine Configurations
        # 'strict' mode completely disables fallback searching and relies purely on explicit links
        if mode == 'strict':
            missing_platforms = []
            
        if missing_platforms and name:
            fallback_tasks = [self.fetchers[p].search_by_name(name) for p in missing_platforms]
            fallback_results_raw = await asyncio.gather(*fallback_tasks, return_exceptions=True)
            
            base_data = fetched_profiles[base_platform]
            
            # FEATURE: N-Gram Heuristic Filter
            # Applies 1, 2, and 3-gram text intersection scoring to rank raw data 
            # and limits candidates to top 5 per platform before triggering LLM API
            fallback_results = []
            for platform, p_candidates in zip(missing_platforms, fallback_results_raw):
                if isinstance(p_candidates, Exception) or not p_candidates:
                    fallback_results.append(p_candidates)
                    debug_data["phase_3_raw"][platform] = []
                    debug_data["phase_3_llm_input"][platform] = []
                else:
                    debug_data["phase_3_raw"][platform] = p_candidates
                    for c in p_candidates:
                        c["platform"] = platform
                    ranked_candidates = self._rank_and_filter_candidates(base_data, p_candidates, limit=5)
                    fallback_results.append(ranked_candidates)
                    debug_data["phase_3_llm_input"][platform] = ranked_candidates
            
            # FEATURE: Engine Configurations (Transparent Mode)
            # If the user chose Transparent mode and hasn't selected a candidate yet, we halt and return 300
            if mode == 'transparent' and not fallback_disambiguation:
                has_candidates = False
                all_candidates = []
                print("DEBUG: fallback_results length:", len(fallback_results))
                for p_candidates in fallback_results:
                    print("DEBUG: p_candidates:", "Exception" if isinstance(p_candidates, Exception) else len(p_candidates))
                    if not isinstance(p_candidates, Exception) and p_candidates:
                        has_candidates = True
                        all_candidates.extend(p_candidates)
                        
                print("DEBUG: has_candidates =", has_candidates)
                if has_candidates:
                    all_candidates.sort(key=lambda x: x.get("match_score", 0), reverse=True)
                    
                    formatted_cands = []
                    for c in all_candidates:
                        formatted_cands.append({
                            "platform": c.get("platform"),
                            "handle": c.get("handle", "unknown"),
                            "match_score": c.get("match_score", 0),
                            "data": c
                        })
                        
                    return {
                        "status": "multiple_choices",
                        "canonical_id": canonical_id,
                        "message": "We crawled your profile but couldn't find explicit links. We found these potential matches by name.",
                        "candidates": formatted_cands,
                        "warnings": resolution_warnings,
                        "debug_data": debug_data
                    }

            if mode == 'transparent' and fallback_disambiguation:
                # The user already saw the disambiguation UI and skipped the remaining platforms.
                # Do NOT run the LLM on them. We are done.
                pass
            else:
                # mode == 'autonomous'
                async def evaluate_platform_group(platform, candidates):
                    if not candidates or isinstance(candidates, Exception):
                        return (platform, -1, 0.0, "No candidates", 0, None, [])
                    
                    try:
                        best_idx, conf, reason_text, tokens = await self.llm.evaluate_platform_candidates(base_data, platform, candidates, user_metadata)
                        return (platform, best_idx, conf, reason_text, tokens, None, candidates)
                    except Exception as e:
                        reason = "LLM tiebreaker unavailable - requires manual review" if "No API key" in str(e) else str(e)
                        return (platform, -1, 0.0, reason, 0, e, candidates)
    
                eval_tasks = []
                for platform, candidates in zip(missing_platforms, fallback_results):
                    eval_tasks.append(evaluate_platform_group(platform, candidates))
                    
                if eval_tasks:
                    eval_results = await asyncio.gather(*eval_tasks)
                    
                    for res in eval_results:
                        platform, best_idx, conf, reason_text, tokens, err, candidates = res
                        
                        if tokens > 0:
                            tracker.record_llm_usage(tokens)
                            
                        if not candidates or isinstance(candidates, Exception):
                            continue
                            
                        if err:
                            resolution_warnings.append(f"LLM Tiebreaker unavailable/failed for {platform}: {str(err)}")
                            for cand in candidates:
                                cand_handle = cand.get("handle", "unknown")
                                raw_id = await asyncio.to_thread(self.db.find_raw_profile_id, platform, cand_handle)
                                if not raw_id:
                                    raw_id = await asyncio.to_thread(self.db.insert_raw_profile, platform, cand_handle, cand)
                                await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, 0.0, reason_text, "pending_review")
                                ambiguous_matches.append({
                                    "platform": platform, "handle": cand_handle, "confidence": 0.0, "reason": reason_text, "raw_id": raw_id, "data": cand, "match_score": 0
                                })
                            continue
                            
                        if best_idx != -1 and 0 <= best_idx < len(candidates):
                            best_candidate = candidates[best_idx]
                            cand_handle = best_candidate.get("handle", "unknown")
                            raw_id = await asyncio.to_thread(self.db.find_raw_profile_id, platform, cand_handle)
                            if not raw_id:
                                raw_id = await asyncio.to_thread(self.db.insert_raw_profile, platform, cand_handle, best_candidate)
                            
                            if conf >= 0.85:
                                await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, conf, reason_text, "confirmed")
                                await asyncio.to_thread(self.db.reject_other_links_for_platform, canonical_id, platform, raw_id)
                                fetched_profiles[platform] = best_candidate
                            else:
                                await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, conf, reason_text, "pending_review")
                                ambiguous_matches.append({
                                    "platform": platform, "handle": cand_handle, "confidence": conf, "reason": reason_text, "raw_id": raw_id, "data": best_candidate, "match_score": 0
                                })
                        else:
                            # FEATURE: Admin Audit Fix
                            # If Gemini returns -1 (no match), explicitly save the top heuristically ranked 
                            # candidate with a 'rejected' status for the Admin Audit log observability.
                            if len(candidates) > 0:
                                best_candidate = candidates[0]
                                cand_handle = best_candidate.get("handle", "unknown")
                                raw_id = await asyncio.to_thread(self.db.find_raw_profile_id, platform, cand_handle)
                                if not raw_id:
                                    raw_id = await asyncio.to_thread(self.db.insert_raw_profile, platform, cand_handle, best_candidate)
                                await asyncio.to_thread(self.db.link_profile, canonical_id, raw_id, conf, "LLM evaluated and rejected this candidate", "rejected")

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
                "warnings": resolution_warnings,
                "debug_data": debug_data
            }

        return {
            "status": "success",
            "canonical_id": canonical_id,
            "warnings": resolution_warnings,
            "debug_data": debug_data
        }
