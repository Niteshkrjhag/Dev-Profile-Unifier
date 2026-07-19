import os
import httpx
import asyncio
from typing import Dict, Any, List
from src.core.base_fetcher import BaseFetcher
from src.core.observability import tracker

class GithubFetcher(BaseFetcher):
    def __init__(self):
        self.token = os.getenv('GITHUB_TOKEN')
        self.headers = {"Authorization": f"token {self.token}"} if self.token else {}
        self.base_url = "https://api.github.com"

    def _track_response(self, res):
        tracker.record_api_call("github")
        tracker.update_github_rate_limit(
            res.headers.get("X-RateLimit-Remaining"),
            res.headers.get("X-RateLimit-Limit"),
            res.headers.get("X-RateLimit-Reset")
        )

    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetches GitHub profile, repos, language frequencies, and recent activity.
        """
        data = {"handle": handle, "profile": {}, "languages": {}, "recent_activity": []}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Fetch Profile
                res = await client.get(f"{self.base_url}/users/{handle}", headers=self.headers)
                self._track_response(res)
                if res.status_code == 403:
                    raise Exception("GitHub API Rate Limited (403). Please wait or use an authenticated token.")
                if res.status_code != 200:
                    return {} # User not found
                    
                data["profile"] = res.json()
                
                # 2. Fetch Repos (for languages and tech stack inference)
                repos_res = await client.get(f"{self.base_url}/users/{handle}/repos?sort=updated&per_page=30", headers=self.headers)
                self._track_response(repos_res)
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
                self._track_response(events_res)
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
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to GitHub: {str(e)}")

    async def search_by_name(self, name: str) -> List[Dict[str, Any]]:
        """
        Asynchronously searches GitHub users by name or email. Returns all fetched candidates concurrently.
        """
        query = f"{name} in:name"
        sem = asyncio.Semaphore(5)
        
        async def fetch_with_sem(handle):
            async with sem:
                return await self.fetch_by_handle(handle)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{self.base_url}/search/users?q={query}", headers=self.headers)
                self._track_response(res)
                if res.status_code == 403:
                    raise Exception("GitHub API Rate Limited (403).")
                if res.status_code == 200:
                    items = res.json().get("items", [])
                    tasks = []
                    for item in items:
                        handle = item.get("login")
                        if handle:
                            tasks.append(fetch_with_sem(handle))
                    
                    if not tasks:
                        return []
                        
                    # Fetch all profiles concurrently but safely bounded by Semaphore
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    candidates = []
                    for r in results:
                        if not isinstance(r, Exception) and r is not None:
                            candidates.append(r)
                            
                    return candidates
            return []
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to GitHub: {str(e)}")
