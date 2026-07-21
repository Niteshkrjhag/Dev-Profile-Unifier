import time
import asyncio
from typing import Dict
from src.core.supabase_client import SupabaseDB

class ObservabilityTracker:
    """
    In-memory singleton to track metrics across the application.
    Flushes to Supabase every 15 seconds for multi-worker consistency.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ObservabilityTracker, cls).__new__(cls)
            cls._instance.metrics = {
                "total_api_calls": {
                    "github": 0,
                    "stackoverflow": 0,
                    "devto": 0,
                    "hackernews": 0
                },
                "github_rate_limit": {
                    "remaining": None,
                    "limit": None,
                    "reset_epoch": None
                },
                "llm": {
                    "total_tokens_used": 0,
                    "estimated_cost_usd": 0.0
                },
                "resolutions": {
                    "count": 0,
                    "total_time_ms": 0,
                    "average_time_ms": 0
                }
            }
            # Background flusher will be started explicitly via start_flusher()
        return cls._instance

    async def start_flusher(self):
        """Called on app startup to load state and begin flushing."""
        db = SupabaseDB()
        try:
            # Load initial global state from DB
            res = await asyncio.to_thread(db.client.table("observability_metrics").select("metrics").eq("id", "global").execute)
            if res.data:
                # We merge existing DB metrics with our initial zeros
                db_metrics = res.data[0]["metrics"]
                self.metrics["total_api_calls"].update(db_metrics.get("total_api_calls", {}))
                self.metrics["github_rate_limit"].update(db_metrics.get("github_rate_limit", {}))
                self.metrics["llm"].update(db_metrics.get("llm", {}))
                self.metrics["resolutions"].update(db_metrics.get("resolutions", {}))
        except Exception as e:
            print(f"Observability load error: {e}")

        # Start the background task
        asyncio.create_task(self._background_flush(db))

    async def _background_flush(self, db):
        while True:
            await asyncio.sleep(5) # Flush every 5s for the demo
            try:
                def do_upsert():
                    db.client.table("observability_metrics").upsert({"id": "global", "metrics": self.metrics}).execute()
                await asyncio.to_thread(do_upsert)
            except Exception:
                pass # Fail silently in background

    def record_api_call(self, platform: str):
        if platform in self.metrics["total_api_calls"]:
            self.metrics["total_api_calls"][platform] += 1

    def update_github_rate_limit(self, remaining: str, limit: str, reset: str):
        if remaining:
            self.metrics["github_rate_limit"]["remaining"] = int(remaining)
        if limit:
            self.metrics["github_rate_limit"]["limit"] = int(limit)
        if reset:
            self.metrics["github_rate_limit"]["reset_epoch"] = int(reset)

    def record_llm_usage(self, tokens: int):
        self.metrics["llm"]["total_tokens_used"] += tokens
        # Gemini 3.5 Flash pricing (approx $0.075 per 1M tokens)
        self.metrics["llm"]["estimated_cost_usd"] = (self.metrics["llm"]["total_tokens_used"] / 1_000_000) * 0.075

    def record_resolution_time(self, time_ms: float):
        m = self.metrics["resolutions"]
        m["count"] += 1
        m["total_time_ms"] += time_ms
        if m["count"] > 0:
            m["average_time_ms"] = m["total_time_ms"] / m["count"]

    def get_metrics(self) -> Dict:
        return self.metrics

# Global instance
tracker = ObservabilityTracker()
