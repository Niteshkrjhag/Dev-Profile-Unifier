# Effiflo Dev Profile Unifier 🚀

A high-performance, fault-tolerant Master Data Management (MDM) system designed to ingest, resolve, and unify a software developer's digital footprint across fragmented platforms (GitHub, StackOverflow, Dev.to, and HackerNews).

Built as a take-home assessment for the AI Data Engineer role at Effiflo.

## 🧠 The Core Problem
The hardest challenge in data engineering is identity resolution. If a database contains a GitHub account named "Nitesh Jha" and a Dev.to account named "Nitesh Jha", how does the system know with 100% certainty that they are the same human? 

This system solves this using a **Tiered Deterministic-to-Heuristic Funnel**.

## 🏗 End-to-End Architecture Flow

When a client submits a request with a developer's name and optional metadata (location, workplace) or explicit handles, the system executes a 5-phase pipeline:

### Phase 0: The Database Cache Check
If the user provides an exact handle (e.g., `github="Niteshkrjhag"`), the engine bypasses all external network calls and checks the Supabase database. If the canonical profile was already resolved, it returns it instantly (< 50ms).

### Phase 1: Disambiguation & Smart Caching
If only a Name and Metadata are provided, the system must search the web to find potential matches.
- **Smart Hashing:** It hashes the exact inputs (e.g., `md5("nitesh|srinagar")`) and checks the `search_cache` table. If a previous user made the same search, it returns the ~300 choices instantly.
- **Candidate Ranking:** If not cached, it concurrently fetches search results from GitHub and StackOverflow. It parses the raw bio JSON of every candidate and increments a `match_score` if the text contains the requested Location or Workplace. The candidates are saved to the cache and returned to the UI for human selection.

### Phase 2: Recursive Graph Crawler
Once a candidate handle is selected (or provided initially), the high-performance async crawler begins.
- It fetches the initial profile and scans its raw JSON (websites, bio links, blog URLs) using regex cross-pollination.
- If it discovers a link to another platform (e.g., finding a Dev.to URL on their GitHub), it adds it to the queue. 
- This recursively loops up to 3 times to mathematically exhaust the developer's connected graph.

### Phase 3: LLM Tie-Breaker (Gemini 3.5)
For any platforms still missing after the deterministic graph crawl, a fallback heuristic search is performed. The raw JSON of the newly found profile is sent alongside the "Anchor" profile to Gemini.
Gemini acts as an expert semantic judge, analyzing nuanced signals like language frequencies, tech stacks, and writing styles.
- **`> 0.85 Confidence:`** Auto-Merges the identity into the canonical database.
- **`0.50 - 0.84 Confidence:`** Flags the link as `pending_review` requiring a Human-in-the-Loop (HITL) admin audit.
- **`< 0.50 Confidence:`** Rejects the profile.

### Phase 4: Executive Summary Generation
Finally, the unified JSON data across all confirmed platforms is passed to Gemini to generate a single, professional executive summary of the developer's career, stack, and impact.

## 🛡️ System Resiliency & Fault Tolerance
This API is engineered to handle massive scale without silently failing:
*   **10-Second Strict Timeouts:** Prevents the async event loop from freezing if external APIs (like HackerNews) go offline.
*   **Rate Limit Protection:** Explicitly intercepts HTTP 429 errors and StackOverflow "backoff" requests, instantly halting crawls and throwing `502 Bad Gateway` to the frontend rather than pretending the user doesn't exist.
*   **Automated Cron Jobs:** A FastAPI background loop runs every 12 hours, deleting `search_cache` entries older than 3 days to prevent "stale" candidate lists.
*   **LLM Markdown Stripping:** Custom regex strips unpredictable formatting from Gemini's JSON outputs, preventing critical `JSONDecodeError` crashes during the Tie-Breaker phase.

## 🗄 Storage Schema (Supabase)
1.  `raw_profiles`: Untouched JSON dumps from platforms (Event Sourcing pattern).
2.  `canonical_entities`: The resolved "Human" identity containing the LLM-generated summary.
3.  `entity_links`: The junction table storing the confidence score and audit status.
4.  `search_cache`: High-speed cache for Phase 1 queries.

## 🚀 Running Locally

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
```
SUPABASE_URL=your_url
SUPABASE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
GITHUB_TOKEN=optional_github_token
STACK_EXCHANGE_KEY=optional_so_key
DEVTO_API_KEY=optional_devto_key
```

3. Run the FastAPI Server & Vite Frontend:
```bash
# Terminal 1
uvicorn src.api.main:app --reload --port 8080

# Terminal 2
cd frontend && npm run dev
```
