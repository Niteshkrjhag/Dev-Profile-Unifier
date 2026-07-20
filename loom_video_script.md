# Loom Video Presentation Script (10-15 Minutes)

## 1. Introduction (1 min)
- **Hook**: "Hi, I'm Nitesh. Today I'm going to walk you through the Dev Profile Unifier, an intelligent Entity Resolution engine I built that aggregates fragmented developer footprints across GitHub, StackOverflow, Dev.to, and HackerNews."
- **Demo**: Quickly open the frontend. Do a fast search using an exact handle (or a name you know works well) just to show the final unified profile UI, proving the app works right out of the gate.

## 2. Architecture & Data Flow (2.5 mins)
- **Concept**: Explain how data flows from the React frontend to FastAPI, and then out to the external APIs.
- **The Phases**:
  - *"Our engine operates in distinct phases to protect rate limits and save LLM tokens."*
  - **Phase 0**: Supabase Cache check. If the handles are known, short-circuit immediately.
  - **Phase 1**: Disambiguation. If only a name is given, fetch top 5 candidates.
  - **Phase 2**: The Graph Crawler. Explain how you recursively look for links inside bios and websites (e.g., finding a Twitter link in a GitHub bio) to deterministically link profiles.
  - **Phase 3**: The LLM Tiebreaker. *"When deterministic crawling fails, we hand the raw JSON over to Gemini 3.5 Flash to act as a semantic resolution agent."*

## 3. Supabase Schema Deep Dive (2.5 mins)
- **Action**: Open your Supabase dashboard and show the tables.
- **Why this design?**: 
  - *"I chose a Star Schema. Instead of dumping everything into one massive user table, I separated the concept of a 'Human' from an 'Account'."*
  - Show `canonical_entities`: *"This is the unified human."*
  - Show `raw_profiles`: *"These are the immutable JSON snapshots from the platforms."*
  - Show `entity_links`: *"This is the junction table. Notice the `confidence_score` and `status` columns. I designed it this way so that if the AI hallucinates a link, a human admin can reject it without deleting the underlying raw data."*

## 4. Entity Resolution in Action (Easy vs. Hard) (3 mins)
- **The Easy Case**: 
  - Search for someone using explicit handles (e.g., providing both a GitHub and StackOverflow handle). 
  - Show how the engine bypasses the LLM entirely, hits Phase 2, and links them deterministically. *"This cost 0 LLM tokens and took 2 seconds."*
- **The Hard Case**:
  - Search for a common name (like "Nitesh") using the **Autonomous AI Fallback** mode.
  - Explain the Disambiguation UI. *"Here, the engine found multiple people. It used heuristics and LLM tiebreaking to try and find the right one."*
  - Show the **Admin Audit** tab. *"Because this was a probabilistic match, it was flagged as 'pending_review' in the database for a human to verify."*

## 5. A Tricky Bug & Edge Case (2 mins)
- **The Infinite Loading / Timeout Bug**:
  - *"One of the most interesting edge cases I hit was dealing with Render's 100-second serverless timeout."*
  - *"Initially, when doing a name search, my engine pulled all 30 users returned by GitHub and did a deep fetch (repos, events) on ALL of them. This resulted in over 200 API calls firing concurrently. The backend took 3 minutes, and the frontend threw a 'Failed to fetch' error."*
  - *"I solved it by optimizing Phase 1: I implemented a hard-cap to only do deep fetches on the top 5 candidates, reducing network volume by 83% and bringing resolution time down to 10 seconds."*

## 6. Observability & Production Readiness (1.5 mins)
- **Action**: Click on the **Health** tab in your UI.
- *"Because LLMs and third-party APIs are expensive and rate-limited, I built a custom Observability Tracker."*
- Point out the Token counts and API request limits.
- *"If I were taking this to production, I would export these metrics to Prometheus and Grafana, and set up alerts for when our GitHub rate limits drop below 10%."*

## 7. Next Week / Conclusion (1 min)
- *"If I had another week, I would focus entirely on latency and predictive graph building. I want to build a connectivity graph for all candidates instantly before the user even selects one. I'd also rewrite the GitHub fetcher to use GraphQL to fetch everything in a single request, minimizing API overhead."*
- **Outro**: Thank them for their time.
