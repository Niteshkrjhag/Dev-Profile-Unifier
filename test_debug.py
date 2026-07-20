import asyncio
import json
from dotenv import load_dotenv
load_dotenv()
from src.core.resolution import ProfileResolver

async def main():
    resolver = ProfileResolver()
    handles = {"github": "mojombo"}
    user_metadata = {"location": "San Francisco"}
    
    print("Testing Transparent mode...")
    result = await resolver.resolve_and_store(
        name="Tom Preston-Werner",
        handles=handles,
        user_metadata=user_metadata,
        mode="transparent",
        depth="normal",
        fallback_disambiguation=False
    )
    
    print(f"Status: {result.get('status')}")
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
