import asyncio
import traceback
from src.fetchers.stackoverflow import StackOverflowFetcher

async def main():
    fetcher = StackOverflowFetcher()
    print("Searching for 'Karan'...")
    user_ids = await fetcher._search_for_user_ids("Karan")
    print(f"Found {len(user_ids)} user_ids:", user_ids[:5], "...")
    
    if user_ids:
        print("\nFetching full data for the first user...")
        try:
            data = await fetcher.fetch_by_handle(user_ids[0])
            print("Successfully fetched full data!")
        except Exception as e:
            print("Failed:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
