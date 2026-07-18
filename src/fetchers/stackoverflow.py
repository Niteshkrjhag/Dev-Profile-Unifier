import os
import httpx
from typing import Dict, Any
from src.core.base_fetcher import BaseFetcher

class StackOverflowFetcher(BaseFetcher):
    def __init__(self):
        self.key = os.getenv('STACK_EXCHANGE_KEY')
        self.base_url = "https://api.stackexchange.com/2.3"
        self.site = "stackoverflow"

    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetches a user's Stack Overflow profile, top tags, top questions, and top answers.
        Uses advanced search if handle isn't a direct user ID.
        """
        data = {"handle": handle, "profile": {}, "top_tags": [], "top_questions": [], "top_answers": []}
        
        # 1. Resolve handle to user_id
        user_id = handle
        if not handle.isdigit():
            user_id = await self._search_for_user_id(handle)
            if not user_id:
                return {} # User not found
                
        # Base query params for Stack Exchange API
        params = {"site": self.site}
        if self.key:
            params["key"] = self.key

        async with httpx.AsyncClient() as client:
            # 2. Fetch Profile
            profile_res = await client.get(f"{self.base_url}/users/{user_id}", params=params)
            if profile_res.status_code == 200 and profile_res.json().get("items"):
                data["profile"] = profile_res.json()["items"][0]
            else:
                return {}

            # 3. Fetch Top Tags
            tags_res = await client.get(f"{self.base_url}/users/{user_id}/top-tags", params=params)
            if tags_res.status_code == 200:
                tags = tags_res.json().get("items", [])
                data["top_tags"] = [{"tag_name": t["tag_name"], "answer_score": t.get("answer_score", 0)} for t in tags[:10]]

            # 4. Fetch Top Answers
            answers_params = params.copy()
            answers_params.update({"order": "desc", "sort": "votes"})
            answers_res = await client.get(f"{self.base_url}/users/{user_id}/answers", params=answers_params)
            if answers_res.status_code == 200:
                answers = answers_res.json().get("items", [])
                data["top_answers"] = [{"score": a["score"], "is_accepted": a["is_accepted"], "question_id": a["question_id"]} for a in answers[:5]]
                
            # 5. Fetch Top Questions
            questions_res = await client.get(f"{self.base_url}/users/{user_id}/questions", params=answers_params)
            if questions_res.status_code == 200:
                questions = questions_res.json().get("items", [])
                data["top_questions"] = [{"score": q["score"], "title": q["title"], "link": q["link"]} for q in questions[:5]]

        return data

    async def _search_for_user_id(self, display_name: str) -> str:
        """
        Asynchronously searches for a user by their exact or partial display name and returns the highest reputation user_id.
        """
        params = {
            "site": self.site,
            "inname": display_name,
            "sort": "reputation",
            "order": "desc"
        }
        if self.key:
            params["key"] = self.key

        async with httpx.AsyncClient() as client:
            res = await client.get(f"{self.base_url}/users", params=params)
            if res.status_code == 200:
                items = res.json().get("items", [])
                if items:
                    # Return the user ID of the highest reputation match
                    return str(items[0]["account_id"])
        return ""

    async def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        Asynchronously searches for a profile by name.
        """
        user_id = await self._search_for_user_id(name)
        if user_id:
            return await self.fetch_by_handle(user_id)
        return {}
