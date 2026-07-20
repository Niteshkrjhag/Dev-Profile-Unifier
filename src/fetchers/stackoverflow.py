import os
import httpx
import asyncio
from typing import Dict, Any, List
from src.core.base_fetcher import BaseFetcher
from src.core.observability import tracker

class StackOverflowFetcher(BaseFetcher):
    def __init__(self):
        self.key = os.getenv('STACK_EXCHANGE_KEY')
        self.base_url = "https://api.stackexchange.com/2.3"
        self.site = "stackoverflow"

    def _track_response(self):
        tracker.record_api_call("stackoverflow")

    async def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        Asynchronously fetches a user's Stack Overflow profile, top tags, top questions, and top answers.
        Uses advanced search if handle isn't a direct user ID.
        """
        data = {"handle": handle, "profile": {}, "top_tags": [], "top_questions": [], "top_answers": []}
        
        # 1. Resolve handle to user_id
        user_id = handle
        if not handle.isdigit():
            user_ids = await self._search_for_user_ids(handle)
            if not user_ids:
                return {} # User not found
            user_id = user_ids[0]
                
        # Base query params for Stack Exchange API
        params = {"site": self.site}
        if self.key:
            params["key"] = self.key

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 2. Fetch Profile
                self._track_response()
                profile_res = await client.get(f"{self.base_url}/users/{user_id}", params=params)
                
                if profile_res.status_code == 429 or profile_res.status_code == 403:
                    raise Exception(f"StackExchange API Rate Limited ({profile_res.status_code}).")
                    
                if profile_res.status_code == 200:
                    res_json = profile_res.json()
                    if "backoff" in res_json:
                        # Log backoff warning; in a real prod system we'd use asyncio.sleep(res_json["backoff"])
                        tracker.record_api_call(f"stackoverflow_backoff_{res_json['backoff']}s")
                        print(f"WARNING: StackExchange API requested backoff of {res_json['backoff']} seconds.")
                        
                    if res_json.get("items"):
                        data["profile"] = res_json["items"][0]
                    else:
                        return {}
                else:
                    return {}

                # 3. Fetch Top Tags
                self._track_response()
                tags_res = await client.get(f"{self.base_url}/users/{user_id}/top-tags", params=params)
                if tags_res.status_code == 200:
                    tags = tags_res.json().get("items", [])
                    data["top_tags"] = [{"tag_name": t["tag_name"], "answer_score": t.get("answer_score", 0)} for t in tags[:10]]

                # 4. Fetch Top Answers
                answers_params = params.copy()
                answers_params.update({"order": "desc", "sort": "votes"})
                self._track_response()
                answers_res = await client.get(f"{self.base_url}/users/{user_id}/answers", params=answers_params)
                if answers_res.status_code == 200:
                    answers = answers_res.json().get("items", [])
                    data["top_answers"] = [{"score": a["score"], "is_accepted": a["is_accepted"], "question_id": a["question_id"]} for a in answers[:5]]
                    
                # 5. Fetch Top Questions
                self._track_response()
                questions_res = await client.get(f"{self.base_url}/users/{user_id}/questions", params=answers_params)
                if questions_res.status_code == 200:
                    questions = questions_res.json().get("items", [])
                    data["top_questions"] = [{"score": q["score"], "title": q["title"], "link": q["link"]} for q in questions[:5]]

                return data
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to StackExchange: {str(e)}")

    async def _search_for_user_ids(self, display_name: str) -> List[str]:
        """
        Asynchronously searches for users by their exact or partial display name and returns all fetched user_ids.
        """
        params = {
            "site": self.site,
            "inname": display_name,
            "sort": "reputation",
            "order": "desc"
        }
        if self.key:
            params["key"] = self.key

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                self._track_response()
                res = await client.get(f"{self.base_url}/users", params=params)
                if res.status_code == 429 or res.status_code == 403:
                    raise Exception(f"StackExchange API Rate Limited ({res.status_code}).")
                if res.status_code == 200:
                    res_json = res.json()
                    if "backoff" in res_json:
                        tracker.record_api_call(f"stackoverflow_backoff_{res_json['backoff']}s")
                        print(f"WARNING: StackExchange API requested backoff of {res_json['backoff']} seconds.")
                    items = res_json.get("items", [])[:5]
                    return [str(item["user_id"]) for item in items]
            return []
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to StackExchange: {str(e)}")

    async def search_by_name(self, name: str) -> List[Dict[str, Any]]:
        """
        Asynchronously searches for a profile by name. Returns all concurrently fetched candidates.
        """
        user_ids = await self._search_for_user_ids(name)
        if not user_ids:
            return []
            
        sem = asyncio.Semaphore(5)
        
        async def fetch_with_sem(uid):
            async with sem:
                return await self.fetch_by_handle(uid)
                
        tasks = [fetch_with_sem(uid) for uid in user_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        candidates = []
        for r in results:
            if not isinstance(r, Exception) and r is not None:
                candidates.append(r)
                
        return candidates
