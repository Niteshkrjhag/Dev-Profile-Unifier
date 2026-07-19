import os
import httpx
from typing import Dict, Any, List
from src.core.base_fetcher import BaseFetcher

class DevToFetcher(BaseFetcher):
    def __init__(self):
        self.key = os.getenv('DEVTO_API_KEY')
        self.headers = {"api-key": self.key} if self.key else {}
        self.base_url = "https://dev.to/api"

    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetches a user's dev.to profile and published articles.
        """
        data = {"handle": handle, "profile": {}, "articles": [], "tags": {}}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Fetch Profile
                profile_res = await client.get(f"{self.base_url}/users/by_username?url={handle}", headers=self.headers)
                if profile_res.status_code == 429 or profile_res.status_code == 403:
                    raise Exception(f"Dev.to API Rate Limited ({profile_res.status_code}).")
                if profile_res.status_code == 200:
                    data["profile"] = profile_res.json()
                else:
                    return {} # User not found
                    
                # 2. Fetch Articles
                articles_res = await client.get(f"{self.base_url}/articles?username={handle}&per_page=30", headers=self.headers)
                if articles_res.status_code == 200:
                    articles = articles_res.json()
                    parsed_articles = []
                    tags_count = {}
                    
                    for a in articles:
                        parsed_articles.append({
                            "title": a.get("title"),
                            "url": a.get("url"),
                            "reactions": a.get("public_reactions_count", 0),
                            "comments": a.get("comments_count", 0),
                            "published_at": a.get("published_at")
                        })
                        
                        for tag in a.get("tag_list", []):
                            tags_count[tag] = tags_count.get(tag, 0) + 1
                            
                    data["articles"] = parsed_articles
                    data["tags"] = tags_count

            return data
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to Dev.to: {str(e)}")

    async def search_by_name(self, name: str) -> List[Dict[str, Any]]:
        """
        Dev.to does not provide a robust name search API for users. 
        Will return empty. Cross-pollination or handle must be used.
        """
        return []
