import asyncio
from src.fetchers.github import GithubFetcher
from dotenv import load_dotenv
load_dotenv()

async def main():
    fetcher = GithubFetcher()
    res = await fetcher.search_by_name('Nitesh Kumar Jha')
    print("GitHub Candidates Found:", len(res))

if __name__ == "__main__":
    asyncio.run(main())
