import asyncio
from src.fetchers.devto import DevToFetcher
import pprint

async def main():
    f = DevToFetcher()
    res = await f.fetch_by_handle('nitesh_krjha_3b665153b84')
    pprint.pprint(res)

asyncio.run(main())
