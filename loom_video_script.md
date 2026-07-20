# Loom Video Presentation Script (10-15 Minutes)

## 1. Introduction (1 min)
- **Hook**: "Hi, I'm Nitesh. Today I'm going to walk you through the Dev Profile Unifier. It's an intelligent Entity Resolution engine I built that aggregates a developer's fragmented footprint across GitHub, StackOverflow, Dev.to, and HackerNews into a single canonical profile."
- **Demo**: Quickly open the frontend. Do a fast search using an exact handle to show the final unified profile UI, proving the core functionality works immediately.

## 2. Architecture & Data Flow (2.5 mins)
- **Concept**: Explain how data flows from the React frontend to the FastAPI backend, and out to the external APIs.
- **The Phases**:
  - *"Our engine operates in distinct phases to protect API rate limits and reduce processing time."*
  - **Phase 0 (Cache)**: *"We first check our Supabase database. If the handles are already known, we return the cached profile instantly."*
  - **Phase 1 (Disambiguation)**: *"If we only have a common name, we query the platforms for their top 5 closest candidates."*
  - **Phase 2 (Graph Crawler)**: *"The engine uses recursive graph traversal. It scans a GitHub bio for external links (like a personal website or Twitter handle), and uses those links to discover other platform accounts deterministically."*
  - **Phase 3 (LLM Tiebreaker)**: *"When deterministic crawling fails, we hand the raw JSON data to Gemini 3.5 Flash. It acts as a semantic resolution agent, analyzing coding languages and writing styles to determine if two accounts belong to the exact same human."*

## 3. Supabase Schema Deep Dive (2.5 mins)
- **Action**: Open your Supabase dashboard and show the tables.
- **Why this design?**: 
  - *"I chose a Star Schema to separate the concept of a 'Human Being' from a 'Platform Account'."*
  - Show `canonical_entities`: *"This table represents the unified human."*
  - Show `raw_profiles`: *"These are the immutable JSON snapshots from GitHub or StackOverflow."*
  - Show `entity_links`: *"This is the junction table that connects them. If the AI is ever unsure about a match, it flags this link as 'Pending Review' so an admin can audit it. This prevents bad data from corrupting the canonical profile."*

## 4. Entity Resolution in Action (Easy vs. Hard) (3 mins)
- **The Easy Case**: 
  - Search for someone using explicit handles. 
  - *"Because we provided exact handles, the engine bypassed the AI completely and linked them deterministically. This cost zero LLM tokens and took 2 seconds."*
- **The Hard Case**:
  - Search for a common name using the **Autonomous AI Fallback** mode.
  - Explain the Disambiguation UI. *"Here, the engine found multiple people. It used heuristics and the LLM tiebreaker to identify the correct one."*
  - Show the **Admin Audit** tab. *"Because this was a probabilistic AI match, it was flagged for human review in our database."*

## 5. A Tricky Bug & Edge Case (2 mins)
- **The Infinite Loading / Timeout Bug**:
  - *"One of the most interesting edge cases I hit was dealing with Render's 100-second serverless timeout."*
  - *"Initially, during a name search, my engine pulled 30 users from GitHub and performed deep fetches on ALL of them concurrently. This resulted in over 200 API calls firing at once, causing the backend to exceed the 100-second timeout."*
  - *"I solved it by optimizing Phase 1: I implemented a hard-cap to only perform deep fetches on the top 5 candidates. This reduced network volume by 83% and brought resolution time down to 10 seconds."*

## 6. Observability & Production Readiness (1.5 mins)
- **Action**: Click on the **Health** tab in your UI.
- *"Because LLMs and third-party APIs are expensive and rate-limited, I built a custom Observability Tracker."*
- Point out the Token counts and API request limits.
- *"If I were taking this to production, I would export these metrics to tools like Prometheus and Grafana, and set up alerts for when our GitHub rate limits drop too low."*

## 7. Next Week (1 min)
- *"If I had another week, my primary focus would be latency reduction. I'd rewrite the GitHub fetcher to use the GraphQL API so I can fetch a user's profile, repositories, and events in a single network request. I'd also build the engine to construct connectivity graphs for all candidates concurrently, so the user doesn't have to guess during the disambiguation phase."*
- **Outro**: Thank them for their time.
