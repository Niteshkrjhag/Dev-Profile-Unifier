from typing import Dict, Any
from src.fetchers.github import GithubFetcher
from src.fetchers.stackoverflow import StackOverflowFetcher
from src.fetchers.devto import DevToFetcher
from src.fetchers.hackernews import HackerNewsFetcher
from src.core.discovery import DiscoveryEngine

class ProfileCollector:
    def __init__(self):
        self.fetchers = {
            "github": GithubFetcher(),
            "stackoverflow": StackOverflowFetcher(),
            "devto": DevToFetcher(),
            "hackernews": HackerNewsFetcher()
        }

    def collect(self, 
                name: str = None, 
                generic_handle: str = None, 
                email: str = None,
                specific_handles: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Orchestrates the data collection across platforms.
        Handles missing inputs and cross-pollinates discovered handles.
        """
        if specific_handles is None:
            specific_handles = {}

        results = {
            "metadata": {
                "inputs": {
                    "name": name,
                    "generic_handle": generic_handle,
                    "email": email,
                    "specific_handles": specific_handles
                },
                "discovered_handles": {}
            },
            "data": {}
        }

        # Step 1: Initialize target handles for each platform
        targets = {
            "github": specific_handles.get("github") or generic_handle,
            "stackoverflow": specific_handles.get("stackoverflow") or generic_handle or name,
            "devto": specific_handles.get("devto") or generic_handle,
            "hackernews": specific_handles.get("hackernews") or generic_handle
        }

        # Fallback to name search for GitHub if no handles/email are provided
        # (Email logic can be added directly to GithubFetcher if needed, keeping it simple for now)
        if not targets["github"] and name:
            gh_data = self.fetchers["github"].search_by_name(name)
            if gh_data:
                results["data"]["github"] = gh_data
                targets["github"] = gh_data.get("handle") # Lock in the found handle
        elif targets["github"]:
            results["data"]["github"] = self.fetchers["github"].fetch_by_handle(targets["github"])

        # Stack Overflow exhaustive search
        if targets["stackoverflow"]:
            results["data"]["stackoverflow"] = self.fetchers["stackoverflow"].fetch_by_handle(targets["stackoverflow"])

        # Dev.to
        if targets["devto"]:
            results["data"]["devto"] = self.fetchers["devto"].fetch_by_handle(targets["devto"])

        # Hacker News
        if targets["hackernews"]:
            results["data"]["hackernews"] = self.fetchers["hackernews"].fetch_by_handle(targets["hackernews"])

        # Step 2: Cross-Pollination Discovery
        # Scan the results we just gathered to find links to other platforms
        discovered = DiscoveryEngine.cross_pollinate(results["data"])
        results["metadata"]["discovered_handles"] = discovered

        # Step 3: Fetch newly discovered handles if we missed them in Step 1
        for platform, disc_handle in discovered.items():
            if not targets.get(platform):
                # We found a handle for a platform we didn't search yet!
                results["data"][platform] = self.fetchers[platform].fetch_by_handle(disc_handle)

        return results
