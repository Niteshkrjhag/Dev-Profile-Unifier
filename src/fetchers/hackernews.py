import httpx
from typing import Dict, Any, List
from src.core.base_fetcher import BaseFetcher
from src.core.observability import tracker

class HackerNewsFetcher(BaseFetcher):
    def __init__(self):
        self.base_url = "https://hn.algolia.com/api/v1"

    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetches recent comments and submissions for a Hacker News user.
        """
        data = {"handle": handle, "profile": {}, "recent_items": []}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Algolia provides a single endpoint for items authored by a user
                tracker.record_api_call("hackernews")
                res = await client.get(f"{self.base_url}/search_by_date?tags=author_{handle}&hitsPerPage=20")
                if res.status_code == 429 or res.status_code == 403:
                    raise Exception(f"HackerNews API Rate Limited ({res.status_code}).")
                if res.status_code == 200:
                    hits = res.json().get("hits", [])
                    if not hits:
                        return {} # User not found or has no activity
                    
                    parsed_items = []
                    for h in hits:
                        item_type = h.get("_tags", ["unknown"])[0] if h.get("_tags") else "unknown"
                        parsed_items.append({
                            "type": item_type,
                            "title": h.get("title") or h.get("story_title"),
                            "text": h.get("comment_text")[:200] if h.get("comment_text") else None,
                            "created_at": h.get("created_at"),
                            "points": h.get("points")
                        })
                    
                    data["recent_items"] = parsed_items
                    # Fake a profile since HN Algolia doesn't provide rich user bios
                    data["profile"] = {"username": handle, "activity_count": len(hits)}

            return data
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to HackerNews: {str(e)}")

    async def search_by_name(self, name: str) -> List[Dict[str, Any]]:
        """
        HN Algolia API doesn't support searching by real name reliably.
        """
        return []
