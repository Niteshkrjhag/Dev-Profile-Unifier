# What I Would Do With More Time (Next Week)

If I had one more week to work on the Dev Profile Unifier, my primary focus would shift from building baseline accuracy to achieving **Extreme Latency Reduction** and **Pre-emptive Graph Resolution**. 

Here is exactly what I would build and why it matters:

## 1. Pre-building Connections (Concurrent Disambiguation)
**The Problem:** Currently, if a name search returns 30 GitHub candidates, the user has to select one *before* the engine crawls their cross-platform links. If they pick the wrong candidate, they have to start over.
**The Solution:** I would re-architect the engine to instantly trigger lightweight connectivity graphs for *all* top candidates concurrently during the disambiguation phase. 
**The Why:** By the time the UI loads, we wouldn't just show 30 isolated GitHub accounts. We would show pre-grouped clusters (e.g., *"Is this you? The candidate with this GitHub, Twitter, and StackOverflow account?"*). This massively reduces cognitive load for the user and requires much less guessing.

## 2. Aggressive API Minimization (GraphQL Migration)
**The Problem:** To get a rich profile from GitHub, the `GithubFetcher` currently has to make up to 7 sequential REST API calls (1 for the profile, 5 for paginated repositories to calculate language frequencies, and 1 for recent events). This creates a network bottleneck and burns through rate limits quickly.
**The Solution:** I would rewrite the fetcher classes to utilize the GitHub **GraphQL** API instead of standard REST endpoints. 
**The Why:** GraphQL allows us to fetch the profile, repository statistics, and recent events in a **single** network request. This would drastically reduce latency (saving ~2-3 seconds per user crawled) and fundamentally eliminate the risk of hitting serverless timeouts during deep crawls.

## 3. Background Processing & WebSockets
**The Problem:** The React frontend currently holds a single HTTP connection open waiting for the FastAPI server to finish crawling. For deeper network crawls, this process takes a long time and the browser might drop the connection.
**The Solution:** I would refactor the architecture into an asynchronous worker model. The API would instantly return a `job_id` and offload the heavy graph crawling to a Celery/Redis background worker. 
**The Why:** This would allow us to use WebSockets (or Server-Sent Events) to stream real-time progress updates to the frontend UI (e.g., *"Found GitHub repo..."* -> *"Crawling Twitter bio..."*). This provides a vastly superior user experience and guarantees the backend will never timeout.
