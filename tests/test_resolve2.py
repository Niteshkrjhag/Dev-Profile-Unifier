import asyncio
import httpx
import time

async def main():
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            res = await client.post('http://localhost:8080/profiles/resolve', json={
                "name": "Nitesh Kumar Jha",
                "github": "nitesh-jha",
                "stackoverflow": "12345"
            })
            print(res.status_code)
            print(res.json())
    except Exception as e:
        print("Error:", e)
    finally:
        print("Time taken:", time.time() - start)

asyncio.run(main())
