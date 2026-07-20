import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from src.core.resolution import ProfileResolver
from src.core.supabase_client import SupabaseDB

async def main():
    resolver = ProfileResolver()
    handles = {"github": "Niteshkrjhag"}
    
    print("Running resolve_and_store to trigger self-healing...")
    result = await resolver.resolve_and_store(name=None, handles=handles)
    print("Resolution Result:", result)
    
    if result.get("canonical_id"):
        db = SupabaseDB()
        profile = db.get_full_canonical_profile(result["canonical_id"])
        print("\n--- HEALED LLM SUMMARY ---")
        print(profile.get("llm_summary"))
        print("--------------------------")

if __name__ == "__main__":
    asyncio.run(main())
