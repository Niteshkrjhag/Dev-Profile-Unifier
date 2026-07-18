import os
import httpx
from typing import Dict, Any, List
from src.core.base_fetcher import BaseFetcher

class GithubFetcher(BaseFetcher):
    def __init__(self):
        self.token = os.getenv('GITHUB_TOKEN')
        self.headers = {"Authorization": f"token {self.token}"} if self.token else {}
        self.base_url = "https://api.github.com"

    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetches GitHub profile, repos, language frequencies, and recent activity.
        """
        data = {"handle": handle, "profile": {}, "languages": {}, "recent_activity": []}
        
        async with httpx.AsyncClient() as client:
            # 1. Fetch Profile
            res = await client.get(f"{self.base_url}/users/{handle}", headers=self.headers)
            if res.status_code != 200:
                return {} # User not found
                
            data["profile"] = res.json()
            
            # 2. Fetch Repos (for languages and tech stack inference)
            repos_res = await client.get(f"{self.base_url}/users/{handle}/repos?sort=updated&per_page=30", headers=self.headers)
            if repos_res.status_code == 200:
                repos = repos_res.json()
                lang_counts = {}
                for r in repos:
                    lang = r.get("language")
                    if lang:
                        lang_counts[lang] = lang_counts.get(lang, 0) + 1
                data["languages"] = lang_counts
            
            # 3. Fetch Recent Activity (Events)
            events_res = await client.get(f"{self.base_url}/users/{handle}/events/public?per_page=30", headers=self.headers)
            if events_res.status_code == 200:
                events = events_res.json()
                activities = []
                for e in events:
                    if e.get("type") in ["PushEvent", "PullRequestEvent"]:
                        repo_name = e.get("repo", {}).get("name", "Unknown")
                        created_at = e.get("created_at")
                        activities.append({
                            "type": e.get("type"),
                            "repo": repo_name,
                            "date": created_at
                        })
                # Limit to top 10 recent meaningful activities
                data["recent_activity"] = activities[:10]

        return data

    async def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        Asynchronously searches GitHub users by name or email. Returns the first strong match's full profile if found.
        """
        # Searching without exact quotes for broader matching
        query = f"{name} in:name"
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{self.base_url}/search/users?q={query}", headers=self.headers)
            if res.status_code == 200:
                items = res.json().get("items", [])
                if items:
                    best_match_handle = items[0].get("login")
                    return await self.fetch_by_handle(best_match_handle)
        return {}
