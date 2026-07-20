# What I Would Do With More Time (Next Week)

If I had one more week to work on the Dev Profile Unifier, my primary focus would shift from building baseline accuracy to achieving **Extreme Latency Reduction** and **Pre-emptive Graph Resolution**. 

Here is exactly what I would build and why:

## 1. Pre-emptive Connectivity Graphs (Concurrent Disambiguation)
**The Problem:** Currently, if a name search returns 30 GitHub candidates, the user has to guess and select one *before* the engine crawls their cross-platform links. If they pick the wrong Nitesh, they have to start over.
**The Solution:** I would rebuild the engine to instantly trigger lightweight connectivity graphs for *all* top candidates concurrently during the disambiguation phase. 
**The Why:** By the time the Multiple Choices UI loads, we wouldn't just show 30 isolated GitHub accounts. We would show pre-grouped clusters: *"Is this you? (GitHub + StackOverflow + Twitter cluster)"*. This massively reduces cognitive load for the user and makes the "Transparent Fallback" mode feel like magic.

## 2. Aggressive API Minimization (GraphQL Migration)
**The Problem:** To get a rich profile from GitHub, the `GithubFetcher` currently has to make up to 7 sequential REST API calls (1 for profile, 5 for paginated repositories to calculate language frequencies, 1 for events). This is a massive network bottleneck and burns through rate limits.
**The Solution:** I would rewrite the fetcher classes to utilize the GitHub GraphQL API. 
**The Why:** GraphQL allows us to fetch the profile, repository statistics, and recent events in a **single** network request. This would drastically reduce latency (saving ~2-3 seconds per user crawled) and fundamentally eliminate the risk of hitting the Render 100-second serverless timeout during deep crawls.

## 3. Background Processing & WebSockets
**The Problem:** The React frontend currently holds a single HTTP connection open waiting for the FastAPI server to finish crawling. If the user sets the crawl depth to "Deeper (5 Iterations)", this process takes a long time and the browser might drop the connection.
**The Solution:** I would refactor the architecture into an asynchronous worker model. FastAPI would instantly return a `job_id` and offload the heavy graph crawling to a Celery/Redis background worker. 
**The Why:** I could then use WebSockets (or Server-Sent Events) to stream real-time updates to the frontend UI (e.g., *"Found GitHub repo..."* -> *"Crawling Twitter bio..."*). This provides a vastly superior UX and guarantees the backend will never timeout, no matter how deep the social graph goes.
