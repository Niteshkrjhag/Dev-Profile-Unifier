import os
import requests
from typing import Dict, Any
from src.core.base_fetcher import BaseFetcher

class DevToFetcher(BaseFetcher):
    def __init__(self):
        self.key = os.getenv('DEVTO_API_KEY')
        self.headers = {"api-key": self.key} if self.key else {}
        self.base_url = "https://dev.to/api"

    def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Fetches Dev.to profile and published articles, extracting top tags.
        """
        data = {
            "platform": "devto",
            "handle": handle,
            "profile": {},
            "published_articles": [],
            "tags_written_about": {}
        }

        # 1. Profile
        prof_res = requests.get(f"{self.base_url}/users/by_username?url={handle}", headers=self.headers)
        if prof_res.status_code == 200:
            p = prof_res.json()
            data["profile"] = {
                "name": p.get("name"),
                "summary": p.get("summary"),
                "location": p.get("location"),
                "website_url": p.get("website_url"),
                "github_details": p.get("github_details"),
                "twitter_username": p.get("twitter_username"),
                "profile_image": p.get("profile_image")
            }
        else:
            # If user not found, return empty
            return data

        # 2. Articles & Tags
        art_res = requests.get(f"{self.base_url}/articles?username={handle}&per_page=30", headers=self.headers)
        if art_res.status_code == 200:
            articles = art_res.json()
            tags_freq = {}
            art_list = []
            
            for a in articles:
                art_list.append({
                    "title": a.get("title"),
                    "url": a.get("url"),
                    "public_reactions_count": a.get("public_reactions_count"),
                    "comments_count": a.get("comments_count"),
                    "published_at": a.get("published_at")
                })
                
                tags = a.get("tag_list", [])
                for t in tags:
                    tags_freq[t] = tags_freq.get(t, 0) + 1
                    
            data["published_articles"] = art_list[:10]  # Store top 10 recent
            data["tags_written_about"] = dict(sorted(tags_freq.items(), key=lambda item: item[1], reverse=True))

        return data

    def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        Dev.to does not provide a robust name search API for users. 
        Will return empty. Cross-pollination or handle must be used.
        """
        return {}
