import os
import requests
from typing import Dict, Any, List
from src.core.base_fetcher import BaseFetcher

class GithubFetcher(BaseFetcher):
    def __init__(self):
        self.token = os.getenv('GITHUB_TOKEN')
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.base_url = "https://api.github.com"

    def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Fetches GitHub profile, repos, languages, and recent activity.
        """
        data = {
            "platform": "github",
            "handle": handle,
            "profile": {},
            "languages": {},
            "recent_activity": []
        }

        # 1. Profile Data
        profile_res = requests.get(f"{self.base_url}/users/{handle}", headers=self.headers)
        if profile_res.status_code == 200:
            p = profile_res.json()
            data["profile"] = {
                "name": p.get("name"),
                "bio": p.get("bio"),
                "location": p.get("location"),
                "public_repos": p.get("public_repos"),
                "followers": p.get("followers"),
                "following": p.get("following"),
                "blog": p.get("blog"),
                "twitter_username": p.get("twitter_username"),
                "avatar_url": p.get("avatar_url"),
                "html_url": p.get("html_url")
            }

        # 2. Public Repos & Languages
        repos_res = requests.get(f"{self.base_url}/users/{handle}/repos?per_page=100&sort=updated", headers=self.headers)
        if repos_res.status_code == 200:
            repos = repos_res.json()
            languages = {}
            for repo in repos:
                lang = repo.get("language")
                if lang:
                    languages[lang] = languages.get(lang, 0) + 1
            data["languages"] = languages

        # 3. Recent Commits/PRs (Events)
        events_res = requests.get(f"{self.base_url}/users/{handle}/events/public?per_page=30", headers=self.headers)
        if events_res.status_code == 200:
            events = events_res.json()
            activities = []
            for ev in events:
                if ev.get("type") in ["PushEvent", "PullRequestEvent"]:
                    repo_name = ev.get("repo", {}).get("name")
                    created_at = ev.get("created_at")
                    
                    if ev["type"] == "PushEvent":
                        commits = ev.get("payload", {}).get("commits", [])
                        for commit in commits:
                            activities.append({
                                "type": "commit",
                                "repo": repo_name,
                                "message": commit.get("message"),
                                "date": created_at
                            })
                    elif ev["type"] == "PullRequestEvent":
                        action = ev.get("payload", {}).get("action")
                        title = ev.get("payload", {}).get("pull_request", {}).get("title")
                        activities.append({
                            "type": "pull_request",
                            "action": action,
                            "repo": repo_name,
                            "title": title,
                            "date": created_at
                        })
            # Limit to top 10 recent meaningful activities
            data["recent_activity"] = activities[:10]

        return data

    def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        Searches GitHub users by name or email. Returns the first strong match's full profile if found.
        """
        # Searching without exact quotes for broader matching
        query = f"{name} in:name"
        res = requests.get(f"{self.base_url}/search/users?q={query}", headers=self.headers)
        if res.status_code == 200:
            items = res.json().get("items", [])
            if items:
                # Naively fetch the first match's full data
                # In a robust discovery engine, we'd want to rank/score these.
                best_match_handle = items[0].get("login")
                return self.fetch_by_handle(best_match_handle)
        return {}

