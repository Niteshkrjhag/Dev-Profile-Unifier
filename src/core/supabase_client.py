import os
from supabase import create_client, Client

class SupabaseDB:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Supabase URL and Key must be provided in environment variables.")
        self.client: Client = create_client(url, key)

    def insert_raw_profile(self, platform: str, handle: str, raw_data: dict) -> str:
        """
        Inserts or updates a raw profile from an external API.
        Returns the UUID of the raw profile.
        """
        data = {
            "platform": platform,
            "handle": handle,
            "raw_data": raw_data
        }
        # Using upsert to handle duplicate fetches
        response = self.client.table("raw_profiles").upsert(data, on_conflict="platform,handle").execute()
        return response.data[0]["id"]

    def get_raw_profile(self, platform: str, handle: str) -> dict:
        """
        Fetches the raw profile data if it already exists in the database.
        """
        res = self.client.table("raw_profiles").select("raw_data").eq("platform", platform).eq("handle", handle).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]["raw_data"]
        return None

    def create_canonical_entity(self, primary_name: str, llm_summary: str = None) -> str:
        """
        Creates a new canonical person entity.
        Returns the UUID.
        """
        data = {"primary_name": primary_name}
        if llm_summary:
            data["llm_summary"] = llm_summary
            
        response = self.client.table("canonical_entities").insert(data).execute()
        return response.data[0]["id"]

    def update_canonical_summary(self, canonical_id: str, summary: str):
        """
        Updates the LLM summary of an existing canonical entity.
        """
        self.client.table("canonical_entities").update({"llm_summary": summary}).eq("id", canonical_id).execute()

    def link_profile(self, canonical_id: str, raw_profile_id: str, confidence_score: float, match_reason: str, status: str = "confirmed"):
        """
        Links a raw profile to a canonical entity with a given confidence score.
        """
        data = {
            "canonical_id": canonical_id,
            "raw_profile_id": raw_profile_id,
            "confidence_score": confidence_score,
            "match_reason": match_reason,
            "status": status
        }
        self.client.table("entity_links").upsert(data, on_conflict="canonical_id,raw_profile_id").execute()

    def get_full_canonical_profile(self, canonical_id: str) -> dict:
        """
        Fetches the canonical entity along with all linked raw profiles (only confirmed ones).
        """
        # We use a join query via Supabase PostgREST
        res = self.client.table("canonical_entities") \
            .select("*, entity_links(confidence_score, match_reason, raw_profiles(platform, handle, raw_data))") \
            .eq("id", canonical_id) \
            .eq("entity_links.status", "confirmed") \
            .execute()
            
        if not res.data:
            return None
        return res.data[0]

    def find_canonical_by_handle(self, platform: str, handle: str) -> str:
        """
        Phase 0 Cache Check: Checks if a raw profile handle is already linked to a canonical entity with 'confirmed' status.
        """
        res = self.client.table("raw_profiles") \
            .select("id, entity_links!inner(canonical_id)") \
            .eq("platform", platform) \
            .eq("handle", handle) \
            .eq("entity_links.status", "confirmed") \
            .execute()
            
        if res.data and len(res.data) > 0:
            links = res.data[0].get("entity_links", [])
            if links:
                return links[0]["canonical_id"]
        return None

    def get_review_links(self) -> list:
        """
        Fetches all entity links that are pending_review or rejected.
        Includes the canonical entity name and the raw profile data.
        """
        res = self.client.table("entity_links") \
            .select("*, canonical_entities(primary_name), raw_profiles(platform, handle, raw_data)") \
            .in_("status", ["pending_review", "rejected"]) \
            .execute()
        return res.data

    def update_link_status(self, canonical_id: str, raw_profile_id: str, new_status: str):
        """
        Admin action to manually confirm or reject an entity link.
        """
        if new_status not in ["confirmed", "rejected"]:
            raise ValueError("Status must be 'confirmed' or 'rejected'")
            
        self.client.table("entity_links") \
            .update({"status": new_status}) \
            .eq("canonical_id", canonical_id) \
            .eq("raw_profile_id", raw_profile_id) \
            .execute()

    def get_search_cache(self, query_hash: str) -> list:
        """
        Phase 1a: Check if we have previously cached the multiple choices for this query hash.
        """
        res = self.client.table("search_cache").select("candidates_json").eq("query_hash", query_hash).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]["candidates_json"]
        return None

    def save_search_cache(self, query_hash: str, candidates: list):
        """
        Phase 1a: Save the multiple choices to prevent redundant API calls for exact same queries.
        """
        data = {
            "query_hash": query_hash,
            "candidates_json": candidates
        }
        self.client.table("search_cache").upsert(data, on_conflict="query_hash").execute()
