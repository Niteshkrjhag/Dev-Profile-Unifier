# Dev Profile Unifier

The Dev Profile Unifier is an intelligent search engine that finds a developer across different platforms (like GitHub, StackOverflow, Dev.to, and HackerNews) and combines all their scattered information into one clean, unified profile. 

## Table of Contents
- [How It Works (Architecture & Data Flow)](#how-it-works-architecture--data-flow)
- [How We Store Data (Schema Design)](#how-we-store-data-schema-design)
- [How We Match Profiles (Entity Resolution)](#how-we-match-profiles-entity-resolution)
- [Keeping Track of Performance (Observability)](#keeping-track-of-performance-observability)
- [Local Setup Instructions](#local-setup-instructions)
- [Next Week (Future Plans)](#next-week-future-plans)

---

## How It Works (Architecture & Data Flow)

The application has two main parts: a **React** frontend (what you see on the screen) and a **FastAPI** backend (the engine running behind the scenes). 

When you search for a developer, the engine goes through a few simple steps:

1. **Step 0 (Fast Cache Check)**: Before doing any hard work, the engine checks our database (**Supabase**) to see if we already know this developer. If we do, it instantly shows their profile.
2. **Step 1 (Name Search & Clarification)**: If we only have a name (like "Nitesh"), the engine asks all the platforms to give us their top 5 closest matches. 
3. **Step 2 (The Graph Crawler)**: The engine acts like a detective. It looks at a developer's GitHub bio to see if they linked their Twitter, and then checks their Twitter to see if they linked their website. It follows these clues to automatically link accounts together.
4. **Step 3 (The AI Tiebreaker)**: If the clues run dry, we give the remaining profiles to a smart AI (**Gemini 3.5 Flash**). The AI reads how the developers write and what technologies they use to figure out if two accounts belong to the exact same person.
5. **Step 4 (The Final Summary)**: Finally, the AI writes a short, professional summary combining everything we learned about the developer.

## How We Store Data (Schema Design)

We use a database called **Supabase**. Instead of putting all the data into one messy table, we separate it logically:

- **`canonical_entities`**: This represents the actual, real-life human being. 
- **`raw_profiles`**: These are the individual accounts (like one specific GitHub account or one StackOverflow account).
- **`entity_links`**: This is the bridge that connects an account to the human being. If the AI is ever unsure if an account belongs to a human, it marks the bridge as "Pending Review" so an administrator can manually approve it later.

This setup is very safe. If we accidentally link the wrong account, we can easily break the bridge without losing any underlying data!

## How We Match Profiles (Entity Resolution)

We try to match profiles in a way that is fast and saves money:

1. **The Fast Way (Exact Match)**: If the developer explicitly linked their accounts together, we trust them 100%. We don't even use the AI, which saves us money.
2. **The Smart Filter**: We double-check basic information, like location and company name, to instantly throw away obvious mismatches.
3. **The AI Detective**: When things get complicated, we ask the **LLM (Large Language Model)** to step in. It reads the raw code and data to make a smart guess.

## Keeping Track of Performance (Observability)

Because AI and third-party platforms are expensive and limit how often we can ask them for data, we built a custom Tracker. 

You can view the **Health** tab in the app to see exactly how many times we've asked GitHub for data today, and how much "AI Brainpower" (Tokens) we've consumed. 

---

## Local Setup Instructions

### Prerequisites
- Python 3.12.3
- Node.js 18+
- A Supabase Project 

### 1. Environment Variables
Copy `.env.example` to `.env` in the main folder and fill in your keys:
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

If I had another week, I would focus on making the app **incredibly fast**:

1. **Pre-building Connections**: Currently, if we find 30 different GitHub accounts, the user has to guess which one is theirs before we look for their other platforms. Next week, I would make the engine instantly figure out the connections for *all* 30 accounts at the same time! This would group them into neat clusters so the user can easily say, "Ah, that's me!"
2. **Asking for Less Data**: Right now, we have to ask GitHub 7 different times to get all the information we need for one person. I would rewrite our engine to use **GraphQL**, which is a special way to ask GitHub for *all* the information in just one single request. This would make the app lightning fast.
