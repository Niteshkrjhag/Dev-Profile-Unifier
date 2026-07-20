# Dev Profile Unifier

An intelligent, cross-platform Identity Resolution Engine that aggregates and unifies a developer's digital footprint across GitHub, StackOverflow, Dev.to, and HackerNews into a single canonical entity. 

## Table of Contents
- [Architecture & Data Flow](#architecture--data-flow)
- [Schema Design](#schema-design)
- [Entity Resolution Strategy](#entity-resolution-strategy)
- [Observability](#observability)
- [Local Setup Instructions](#local-setup-instructions)
- [Next Week (Future Scope)](#next-week-future-scope)

---

## Architecture & Data Flow

The application is split into a **FastAPI** backend and a **React/Vite** frontend, completely decoupled to allow independent scaling.

1. **API Ingestion (`POST /profiles/resolve`)**: The user submits a name and optional metadata (handles, location, workplace).
2. **Phase 0 (High-Speed Cache)**: Before any external APIs are hit, the system checks Supabase. If the exact handles are already linked to a canonical profile, it instantly returns the cached Canonical ID.
3. **Phase 1 (Disambiguation & Search)**: If explicit handles aren't provided, the engine queries the external platform APIs by name. We strictly limit deep fetches to the top 5 candidates to prevent cascading API rate limits.
4. **Phase 2 (Graph Crawler)**: Using known handles, the engine recursively scrapes the platforms, extracting links (e.g., a Twitter link in a GitHub bio) to discover other profiles belonging to the same human. 
5. **Phase 3 (LLM Tiebreaker)**: If platforms are missing, we take the remaining top candidates and feed their raw JSON into **Gemini 3.5 Flash**. The LLM uses heuristics (like tech stack overlaps and writing style) to confidently tiebreak and unify the profile.
6. **Phase 4 (Executive Summary)**: The unified data is summarized into a single professional paragraph by the LLM and returned to the client.

## Schema Design

The Supabase schema is built around the concept of a **Star Schema for Identity**.

- **`canonical_entities`**: The single source of truth for a human being (contains their `primary_name` and the AI-generated `llm_summary`).
- **`raw_profiles`**: The raw, unstructured JSON payloads returned by GitHub, StackOverflow, etc. Each row represents one account on one platform.
- **`entity_links`**: The junction table connecting a `canonical_entity` to a `raw_profile`. It includes a `confidence_score` and a `status` (confirmed, pending_review, rejected). This allows a Human-in-the-Loop (HITL) admin to audit AI-generated links.
- **`search_cache`**: A hashed cache table that stores the results of computationally expensive cross-platform name searches.

This architecture ensures we never lose raw data and can easily recalculate a canonical identity if an incorrect link is removed.

## Entity Resolution Strategy

Our strategy balances speed, API limits, and accuracy using a fallback hierarchy:

1. **Exact Match (Deterministic)**: If a user provides an explicit handle, or if a handle is extracted directly from a bio during the Graph Crawl, it is linked with 1.0 confidence. Zero LLM tokens are wasted.
2. **N-Gram Heuristic Filter**: Before asking the LLM to analyze candidates, we use lightweight string intersection (N-Grams) on locations and workplaces to filter out obvious mismatches.
3. **Semantic LLM Tiebreaker (Probabilistic)**: When deterministic matching fails, we prompt a Large Language Model to act as an Entity Resolution Agent. It compares the raw JSON of an Anchor profile (e.g., a known GitHub account) against 5 Candidates (e.g., 5 potential StackOverflow accounts) to find nuanced signals like shared obscure repositories.

## Observability

The backend utilizes a custom `Tracker` singleton that intercepts and logs:
- API calls per platform (and tracks GitHub/StackExchange rate limits)
- LLM Token consumption
- Resolution Engine latency
- Disambiguation flow counts

This data is exposed via a `GET /health` endpoint and visualized in the React frontend's **Health** tab, allowing operators to monitor the financial (tokens) and infrastructure (rate limits) costs in real-time.

---

## Local Setup Instructions

### Prerequisites
- Python 3.12.3
- Node.js 18+
- A Supabase Project (with the SQL schema applied)

### 1. Environment Variables
Copy `.env.example` to `.env` in the root directory and fill in your keys:
```bash
cp .env.example .env
```
*(Required: `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`. Optional: `GITHUB_TOKEN`, `STACK_EXCHANGE_KEY`, `DEVTO_API_KEY`).*

### 2. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server (starts on http://localhost:8080)
uvicorn src.server:app --host 0.0.0.0 --port 8080 --reload
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run the Vite development server (starts on http://localhost:5173)
npm run dev
```

---

## What I Would Do With More Time (Next Week)

If I had another week to work on this, my core focus would be on **Extreme Latency Reduction** and **Pre-emptive Graph Resolution**:

1. **Pre-emptive Connectivity Graphs**:
   Right now, if a name search returns 30 GitHub candidates, the user has to select one *before* we crawl their cross-platform links. Next week, I would build a concurrent engine that instantly builds a localized connectivity graph for *all* top candidates simultaneously. By the time the disambiguation UI loads, we could show the user: *"Is this you? (GitHub + StackOverflow + Twitter)"* instead of just showing them isolated GitHub accounts. 
   
2. **Aggressive API Minimization**:
   I want to radically reduce the number of API calls we make. I would redesign the fetcher classes to utilize GraphQL (for GitHub) to fetch the profile, repos, and events in a single network request instead of 7 sequential REST calls. 

3. **Background Processing & Webhooks**:
   Currently, the React frontend waits on a single HTTP connection. For deeper crawls (Depth 5), this hits serverless timeout limits. I would refactor the architecture to return a `job_id` immediately, process the graph in a Celery/Redis background worker, and push the final unified profile to the frontend via WebSockets or Server-Sent Events (SSE).
