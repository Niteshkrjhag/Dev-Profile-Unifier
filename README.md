# Dev Profile Unifier

![Dev Profile Unifier Dashboard](https://github.com/user-attachments/assets/5b5474d6-8945-4ec1-b836-92f5c0eaa074)

**🚀 Live Demo / Deployment:** [Vercel Deployment Link](https://vercel.com/niteshkrjhags-projects/dev-profile-unifier/GvokVr2itpzaR4n3sTMUrPgFMuoH)

Basically, it's an automated identity resolution engine. We take a developer's scattered footprints across different platforms (GitHub, StackOverflow, HackerNews, Dev.to, etc.) and programmatically prove they belong to the exact same human being, rolling them up into one canonical profile.

## Table of Contents
- [Architecture & Data Flow](#architecture--data-flow)
- [Schema Design](#schema-design)
- [Entity Resolution Strategy](#entity-resolution-strategy)
- [Observability](#observability)
- [Local Setup Instructions](#local-setup-instructions)
- [Next Week (Future Scope)](#next-week-future-scope)

---

## Architecture & Data Flow

We split this into a **React** frontend and a **FastAPI** backend so the UI and the heavy data processing engine can scale independently.

When you search for a dev, the backend pipeline runs through a few distinct phases:

1. **Phase 0 (Supabase Cache)**: Before we even touch an external API, we hit our Supabase DB. If we already know who this is, we just pull the cached canonical profile and render it instantly.
2. **Phase 1 (Disambiguation)**: If you just search a common name (like "Nitesh"), we concurrently query the platforms and use lightweight string matching (location, workplace) to rank the top candidates.
3. **Phase 2 (Graph Crawler)**: Once we have a base profile (usually GitHub), we scrape the raw JSON for bio links or personal websites. If we find a literal URL pointing to another platform, we follow it. This gives us a 100% deterministic, mathematically proven link.
4. **Phase 3 (LLM Tiebreaker)**: If their bio is empty, we fall back to AI. We dump the base profile JSON and the candidate JSONs into Gemini 3.5 Flash. It acts like a human investigator, comparing tech stacks and repos to figure out if they are the same person.
5. **Phase 4 (Executive Summary)**: Finally, we feed the massively unified payload back to the LLM to generate a quick, readable summary of their entire career.

```mermaid
graph TD
    Start([User Submits Search]) --> HasHandles{Provided Handles?}
    
    %% Phase 0 (Only if handles provided)
    HasHandles -- "Yes" --> Phase0{Phase 0: Identity Cache}
    Phase0 -- "All Handles Cached" --> End([Show Profile])
    Phase0 -- "New Handles Provided" --> Phase2

    subgraph "Phase 1: Disambiguation"
        HasHandles -- "No" --> SearchCache{Phase 1: Search Cache}
        SearchCache -- "Hit" --> Mode1{Engine Mode?}
        SearchCache -- "Miss" --> Fetch1[Fetch Name from APIs]
        Fetch1 --> SaveCache[(Save to Search Cache)]
        SaveCache --> Mode1
        
        Mode1 -- "Autonomous / Hybrid" --> AI1[AI Selects Best Match]
        Mode1 -- "Transparent / Strict" --> AskUser1([Ask User to Pick Match])
        AI1 -- "AI Uncertain" --> AskUser1
    end

    subgraph "Phase 2: Graph Crawler"
        AskUser1 -- "User Selects" --> Phase2[Scrape Profiles for Bio Links]
        AI1 -- "AI Confident" --> Phase2
        Phase2 --> Extract[Find Connected Accounts]
    end

    subgraph "Phase 3: Fallback Search"
        Extract --> Missing{Missing Platforms?}
        Missing -- "Yes" --> Mode3{Engine Mode?}
        Mode3 -- "Autonomous" --> AI3[AI Semantic Tiebreaker]
        Mode3 -- "Transparent" --> AskUser2([Ask User to Pick Match])
        AI3 -- "AI Uncertain" --> AskUser2
    end

    subgraph "Phase 4: Summarization"
        Missing -- "No" --> Final[Generate AI Summary]
        Mode3 -- "Strict / Hybrid" --> Final
        AI3 -- "AI Confident" --> Final
        AskUser2 -- "User Selects" --> Final
        Final --> DB[Save Identity to Database]
        DB --> End
    end
```

## Schema Design

We use a **Star Schema** in Supabase to keep our data safe and structured:

- **`canonical_entities`**: The single source of truth. Represents the actual human.
- **`raw_profiles`**: Immutable JSON snapshots of their individual platform accounts (e.g., a specific GitHub account).
- **`entity_links`**: A junction table that bridges a `raw_profile` to a `canonical_entity`. 
- **`search_cache`**: Caches the heavy cross-platform candidate searches so we don't spam the APIs on page reloads.
- **`api_metrics`**: A centralized table where we log API calls and track external rate limits in real-time.

If the AI has to guess on a match, it flags the `entity_link` with a "Pending Review" status. This means a human admin can manually approve or reject the AI's decision later without destroying the underlying raw data.

## Entity Resolution Strategy

We designed this to balance speed, API rate limits, and safety:

1. **Deterministic Matching (Fast)**: If a developer explicitly provides their handles, or if our Graph Crawler finds a direct link in their bio, we link the accounts with 100% confidence. This avoids using AI entirely, saving processing time and tokens.
2. **N-Gram Heuristic Filter**: We use lightweight string matching on locations and company names to quickly drop obvious mismatches before they ever reach the AI.
3. **Semantic LLM Matching**: For the tricky ones, we use Large Language Models (LLMs) to catch nuanced signals that traditional code might miss, like shared obscure repositories.

### Preventing Identity Collision (Engine Modes)
The biggest headache when pulling profiles across different platforms (GitHub, StackOverflow, Dev.to, HackerNews, etc.) is **Identity Collision**—basically, merging Jane's GitHub with John's StackOverflow by accident and corrupting the canonical profile. To prevent this, we built a few fallback layers:

- **Phase 0 Hard-Stop**: If someone explicitly passes in handles that already map to two *different* people in our DB, we immediately throw an error and abort. We never silently merge them.
- **Strict Mode**: No AI involved. We only link accounts if we find a literal URL pointing to it in their bio (like a Twitter link in a GitHub readme). It's 100% deterministic and safe.
- **Transparent Mode**: Pure human-in-the-loop. If we get multiple hits for a name search, we pause the pipeline and pop up a modal asking the user to manually pick the right one.
- **Autonomous Mode**: We dump the candidate JSONs into the LLM and let it guess. If the AI isn't super confident (score < 85%), it bails out and falls back to Transparent mode.
- **Hybrid Mode**: This is what we use to prevent UI fatigue. The LLM tries to guess, but if it gets confused, instead of bothering the user with a popup, the backend just quietly takes the top heuristic match from Phase 1 and moves on.

## Observability

Because AI tokens and external API calls are expensive and heavily rate-limited, we built a custom Observability Tracker. 

The **Health** tab in the UI gives you real-time metrics, letting you monitor exactly how many API calls we've made and how many LLM tokens we've burned during the resolution process.

---

## Local Setup Instructions

### Prerequisites
- Python 3.12.3
- Node.js 18+
- A Supabase Project 

### 1. Environment Variables
Copy `.env.example` to `.env` in the root directory and fill in your API keys:
```bash
cp .env.example .env
```

### 2. Backend Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.server:app --host 0.0.0.0 --port 8080 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## What I Would Do With More Time (Next Week)

If I had another week, my main focus would be **Extreme Latency Reduction**:

1. **Concurrent Graph Resolution**: Right now, if a search returns 30 GitHub candidates, you have to select one before we crawl for their other platform links. I would re-architect the engine to build connectivity graphs for *all* candidates concurrently, so we could present fully unified clusters to the user instantly.
2. **GraphQL Migration**: We currently make up to 7 sequential REST API calls just to fully resolve a single GitHub profile. I would migrate this to the GitHub GraphQL API, allowing us to fetch the profile, repositories, and recent events in a single network request. This would drastically reduce latency.
