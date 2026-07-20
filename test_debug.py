import asyncio
import json
from dotenv import load_dotenv
load_dotenv()
from src.core.resolution import ProfileResolver

async def main():
    resolver = ProfileResolver()
    handles = {"devto": "niteshkrjha"}
    user_metadata = {"location": "San Francisco"}
    
    print("Testing Autonomous mode...")
    result = await resolver.resolve_and_store(
        name="Nitesh Kumar Jha",
        handles=handles,
        user_metadata=user_metadata,
        mode="autonomous",
        depth="lighter",
        fallback_disambiguation=False
    )
    
    print(f"Status: {result.get('status')}")
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
