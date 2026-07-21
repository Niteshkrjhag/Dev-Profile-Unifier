# Loom Video Presentation Script (10-15 Minutes)

## 1. Introduction (1 min)
- **Hook**: "Hi, I'm Nitesh. Today I'm going to walk you through the Dev Profile Unifier. It's an intelligent Entity Resolution engine I built that aggregates a developer's fragmented footprint across GitHub, StackOverflow, Dev.to, and HackerNews into a single canonical profile."
- **Demo**: Quickly open the frontend. Do a fast search using an exact handle to show the final unified profile UI, proving the core functionality works immediately.

## 2. Architecture & Data Flow (2.5 mins)
- **Concept**: Explain how data flows from the React frontend to the FastAPI backend, and out to the external APIs.
- **The Phases**:
  - *"Our engine operates in distinct phases to protect API rate limits and reduce processing time. We also built **4 distinct Engine Modes** (Hybrid, Autonomous, Strict, Transparent) to control the cost/latency tradeoff."*
  - **Phase 0 (Cache & Identity Collision)**: *"We first check our Supabase database. If the handles are already known, we return the cached profile instantly. We also implemented a hard-error **Identity Collision** detector here: if a user searches for two handles that belong to two *different* known people in the database, the engine aborts to protect our data integrity."*
  - **Phase 1 (Disambiguation)**: *"If we only have a common name, we query the platforms for their top 5 closest candidates."*
  - **Phase 2 (Graph Crawler)**: *"The engine uses recursive graph traversal. It scans a GitHub bio for external links (like a personal website or Twitter handle), and uses those links to discover other platform accounts deterministically."*
  - **Phase 3 (LLM Tiebreaker)**: *"When deterministic crawling fails, we hand the raw JSON data to Gemini 3.5 Flash. It acts as a semantic resolution agent, analyzing coding languages and writing styles to determine if two accounts belong to the exact same human."*

## 3. Supabase Schema Deep Dive (2.5 mins)
- **Action**: Open your Supabase dashboard and show the tables.
- **Why this design?**: 
  - *"I chose a Star Schema to separate the concept of a 'Human Being' from a 'Platform Account'."*
  - Show `canonical_entities`: *"This table represents the unified human."*
  - Show `raw_profiles`: *"These are the immutable JSON snapshots from GitHub or StackOverflow. They are highly extensible if we ever add a 5th data source."*
  - Show `entity_links`: *"This is the junction table that connects them. If the AI is ever unsure about a match, it flags this link as 'Pending Review' so an admin can audit it. This prevents bad data from corrupting the canonical profile."*

## 4. Entity Resolution in Action (Easy vs. Hard) (3 mins)
- **The Easy Case (Strict Mode)**: 
  - Search for someone using explicit handles. 
  - *"Because we provided exact handles, the engine bypassed the AI completely and linked them deterministically. This cost zero LLM tokens and took seconds."*
- **The Hard Case (Hybrid Mode)**:
  - Search for a common name using **Hybrid Mode**.
  - *"In Hybrid mode, we heavily prioritize user experience. If the AI gets confused during Phase 1 disambiguation, instead of throwing a UI modal and asking the user to manually guess, it quietly falls back to the top heuristic match and proceeds."*
  - Show the **Admin Audit** tab. *"Because this was a probabilistic AI match, it was flagged for human review in our database. The admin can reject it if the heuristic was wrong."*

## 5. A Tricky Bug & Edge Case (2 mins)
- **The Identity Collision Edge Case**:
  - *"One of the most dangerous edge cases I discovered was 'Identity Bleeding'. I realized that if a user manually submitted a search with two handles that actually belonged to two completely *different* known people in our database (e.g., Jane's GitHub and John's StackOverflow), the engine might silently merge them together into a single Canonical Entity."*
  - *"To fix this, I engineered a hard-stop in Phase 0. Before any processing happens, the engine maps all provided handles to their known `canonical_id`. If it detects more than one distinct ID, it throws an `Identity Collision` error and aborts. This is a critical safeguard that protects the integrity of our Star Schema."*

## 6. Observability & Production Readiness (1.5 mins)
- **Action**: Click on the **Monitoring** tab in your UI.
- *"Because LLMs and third-party APIs are expensive and rate-limited, I built a custom Observability Tracker."*
- Point out the Token counts and API request limits.
- *"A cool feature here is that the LLM usage automatically aggregates tokens across multiple providers. We have an Ollama fallback implemented, and if Gemini fails, the tracker seamlessly combines the Ollama tokens with the Gemini tokens so the dashboard is always accurate."*

## 7. Next Week (1 min)
- *"If I had another week, my primary focus would be latency reduction. I'd rewrite the GitHub fetcher to use the GraphQL API so I can fetch a user's profile, repositories, and events in a single network request. I'd also build the engine to construct connectivity graphs for all candidates concurrently."*
- **Outro**: Thank them for their time.
