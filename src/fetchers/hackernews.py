import httpx
from typing import Dict, Any
from src.core.base_fetcher import BaseFetcher

class HackerNewsFetcher(BaseFetcher):
    def __init__(self):
        self.base_url = "https://hn.algolia.com/api/v1"

    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetches recent comments and submissions for a Hacker News user.
        """
        data = {"handle": handle, "profile": {}, "recent_items": []}
        
        async with httpx.AsyncClient() as client:
            # Algolia provides a single endpoint for items authored by a user
            res = await client.get(f"{self.base_url}/search_by_date?tags=author_{handle}&hitsPerPage=20")
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

    async def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        HN Algolia API doesn't support searching by real name reliably.
        """
        return {}
