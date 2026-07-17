import requests
from typing import Dict, Any
from src.core.base_fetcher import BaseFetcher

class HackerNewsFetcher(BaseFetcher):
    def __init__(self):
        self.base_url = "https://hn.algolia.com/api/v1"

    def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Fetches user's comments and submissions from Hacker News via Algolia.
        """
        data = {
            "platform": "hackernews",
            "handle": handle,
            "profile": {},
            "submissions": [],
            "comments": []
        }

        # 1. Profile (mostly just karma/creation date on HN API)
        prof_res = requests.get(f"{self.base_url}/users/{handle}")
        if prof_res.status_code == 200:
            p = prof_res.json()
            data["profile"] = {
                "username": p.get("username"),
                "about": p.get("about"),
                "karma": p.get("karma"),
                "created_at": p.get("created_at")
            }
        else:
            return data

        # 2. Activity (Submissions and Comments)
        act_res = requests.get(f"{self.base_url}/search?tags=author_{handle}&hitsPerPage=30")
        if act_res.status_code == 200:
            hits = act_res.json().get("hits", [])
            for hit in hits:
                tags = hit.get("_tags", [])
                created_at = hit.get("created_at")
                if "story" in tags:
                    data["submissions"].append({
                        "title": hit.get("title"),
                        "url": hit.get("url"),
                        "points": hit.get("points"),
                        "num_comments": hit.get("num_comments"),
                        "created_at": created_at
                    })
                elif "comment" in tags:
                    data["comments"].append({
                        "story_title": hit.get("story_title"),
                        "comment_text": hit.get("comment_text")[:200] + "..." if hit.get("comment_text") else "",
                        "points": hit.get("points", 0),
                        "created_at": created_at
                    })

        return data

    def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        HN does not have a generic name search for users, only handles.
        """
        return {}
