import asyncio
import json
from dotenv import load_dotenv
load_dotenv()
from src.core.resolution import ProfileResolver
from src.core.supabase_client import SupabaseDB
from src.llm.summarizer import LLMService
from src.fetchers.github import GithubFetcher
from src.fetchers.stackoverflow import StackOverflowFetcher
from src.fetchers.devto import DevToFetcher
from src.fetchers.hackernews import HackerNewsFetcher
from src.core.discovery import DiscoveryEngine

async def main():
    engine = ProfileResolver()

    print("Testing Strict Mode (should NOT search missing platforms)...")
    res1 = await engine.resolve_and_store("Nitesh Kumar Jha", {"devto": "nitesh_krjha_3b665153b84"}, mode="strict")
    print("Strict Result:", res1)
    
    print("\nTesting Transparent Mode (should return multiple_choices)...")
    res2 = await engine.resolve_and_store("Nitesh Kumar Jha", {"devto": "nitesh_krjha_3b665153b84"}, mode="transparent")
    print("Transparent Result:", res2)

    print("\nTesting Autonomous Mode (should evaluate with LLM)...")
    res3 = await engine.resolve_and_store("Nitesh Kumar Jha", {"devto": "nitesh_krjha_3b665153b84"}, mode="autonomous")
    print("Autonomous Result:", res3)
    
if __name__ == "__main__":
    asyncio.run(main())
