import os
import requests
from typing import Dict, Any
from src.core.base_fetcher import BaseFetcher

class StackOverflowFetcher(BaseFetcher):
    def __init__(self):
        self.key = os.getenv('STACK_EXCHANGE_KEY')
        self.base_url = "https://api.stackexchange.com/2.3"
        self.default_params = {"site": "stackoverflow"}
        if self.key:
            self.default_params["key"] = self.key

    def fetch_by_handle(self, handle: str) -> Dict[str, Any]:
        """
        For Stack Overflow, a 'handle' is typically a string search parameter (inname).
        Stack Exchange uses user_ids internally. So we must search by 'inname' first.
        We will iterate through the returned users and fetch exhaustively as requested.
        """
        return self.search_by_name(handle)

    def search_by_name(self, name: str) -> Dict[str, Any]:
        """
        Searches users by inname. Exhaustively iterates over returned users (limit 5) 
        and fetches top tags, questions, and answers for each.
        """
        p = self.default_params.copy()
        p["inname"] = name
        p["order"] = "desc"
        p["sort"] = "reputation"
        
        data = {
            "platform": "stackoverflow",
            "search_query": name,
            "matched_users": []
        }

        res = requests.get(f"{self.base_url}/users", params=p)
        if res.status_code != 200:
            return data

        users = res.json().get("items", [])
        
        # Limit to top 5 users to avoid exhausting API quotas
        for u in users[:5]:
            user_id = u.get("user_id")
            if not user_id:
                continue
                
            user_data = {
                "profile": {
                    "user_id": user_id,
                    "display_name": u.get("display_name"),
                    "reputation": u.get("reputation"),
                    "location": u.get("location"),
                    "website_url": u.get("website_url"),
                    "link": u.get("link"),
                    "profile_image": u.get("profile_image")
                },
                "top_tags": self._fetch_top_tags(user_id),
                "top_answers": self._fetch_top_answers(user_id),
                "top_questions": self._fetch_top_questions(user_id)
            }
            data["matched_users"].append(user_data)
            
        return data

    def _fetch_top_tags(self, user_id: int):
        p = self.default_params.copy()
        res = requests.get(f"{self.base_url}/users/{user_id}/top-tags", params=p)
        if res.status_code == 200:
            tags = res.json().get("items", [])
            return [{"tag_name": t.get("tag_name"), "answer_score": t.get("answer_score"), "question_score": t.get("question_score")} for t in tags[:10]]
        return []

    def _fetch_top_answers(self, user_id: int):
        p = self.default_params.copy()
        p.update({"order": "desc", "sort": "votes"})
        res = requests.get(f"{self.base_url}/users/{user_id}/answers", params=p)
        if res.status_code == 200:
            answers = res.json().get("items", [])
            return [{"answer_id": a.get("answer_id"), "score": a.get("score"), "is_accepted": a.get("is_accepted")} for a in answers[:5]]
        return []

    def _fetch_top_questions(self, user_id: int):
        p = self.default_params.copy()
        p.update({"order": "desc", "sort": "votes"})
        res = requests.get(f"{self.base_url}/users/{user_id}/questions", params=p)
        if res.status_code == 200:
            questions = res.json().get("items", [])
            return [{"question_id": q.get("question_id"), "title": q.get("title"), "score": q.get("score"), "view_count": q.get("view_count")} for q in questions[:5]]
        return []
