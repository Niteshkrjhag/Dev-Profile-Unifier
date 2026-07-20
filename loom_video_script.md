# Loom Video Presentation Script (10-15 Minutes)

## 1. Introduction (1 min)
- **Hook**: "Hi, I'm Nitesh. Today I'm going to walk you through the Dev Profile Unifier. It's a smart search engine I built that acts like a detective—it finds a developer's scattered accounts across GitHub, StackOverflow, and other sites, and stitches them together into one clean profile."
- **Demo**: Quickly open the frontend. Do a fast search using an exact handle just to show the final beautiful profile, proving the app works right out of the gate.

## 2. How It Works (Architecture) (2.5 mins)
- **Concept**: Explain that the React frontend talks to the FastAPI backend, which then talks to the outside world.
- **The Steps**:
  - *"Our engine works in steps to save time and money."*
  - **Step 0**: The Cache. *"Before doing any work, we check if we already know this person in our Supabase database. If we do, we show the results instantly."*
  - **Step 1**: Disambiguation. *"If we only have a common name, we ask the platforms for their top 5 closest matches."*
  - **Step 2**: The Graph Crawler. *"The engine acts like a detective. It looks at a GitHub bio to see if there's a Twitter link, and follows that link to find more accounts."*
  - **Step 3**: The AI Tiebreaker. *"If the clues run dry, we hand the raw data over to Gemini 3.5 Flash. It acts as an AI detective, looking at how the developers code and write to figure out if two accounts belong to the exact same person."*

## 3. How We Store Data (Schema) (2.5 mins)
- **Action**: Open your Supabase dashboard and show the tables.
- **Why this design?**: 
  - *"I designed the database logically. I separated the concept of a 'Human Being' from a 'Platform Account'."*
  - Show `canonical_entities`: *"This table represents the actual human."*
  - Show `raw_profiles`: *"This table holds the raw account data from GitHub or StackOverflow."*
  - Show `entity_links`: *"This is the bridge that connects the human to the account. If the AI is ever unsure, it flags this bridge as 'Pending Review' so an admin can double-check it. This makes the system very safe."*

## 4. Seeing It In Action (Easy vs. Hard) (3 mins)
- **The Easy Case**: 
  - Search for someone using explicit handles. 
  - *"Because we gave it exact handles, the engine bypassed the AI completely and just linked them together. This cost us zero money in AI tokens and took 2 seconds."*
- **The Hard Case**:
  - Search for a common name (like "Nitesh") using the **Autonomous** mode.
  - Show the Disambiguation UI. *"Here, the engine found multiple people. It used the AI to guess the right one."*
  - Show the **Admin Audit** tab. *"Because the AI had to guess, it flagged it for a human to review. Here I can approve or reject the AI's work."*

## 5. A Tricky Bug & Edge Case (2 mins)
- **The Infinite Loading / Timeout Bug**:
  - *"One tricky bug I hit was a server timeout on Render. Render gives us 100 seconds to finish our work."*
  - *"At first, when I searched a name, my engine pulled 30 users from GitHub and asked for all their data at once. This created over 200 requests! The server took 3 minutes and crashed."*
  - *"I solved it by optimizing the search. Now, it only asks for deep data on the top 5 candidates. This dropped our network traffic by 83% and made the app super fast again."*

## 6. Keeping Track of Health (Observability) (1.5 mins)
- **Action**: Click on the **Health** tab in your UI.
- *"Because AI and external platforms limit how much we can use them, I built a Health Tracker."*
- Point out the Token counts and API requests.
- *"In a real-world scenario, I would set up alerts so that if our GitHub limits drop too low, the engineering team gets a notification."*

## 7. Next Week (1 min)
- *"If I had another week, I'd make the app even faster. Instead of asking GitHub for information 7 times for one person, I'd use a technology called GraphQL to get all the data in one single request. I'd also make the engine instantly build connection graphs for all candidates at the same time, making it easier for the user to select the right person."*
- **Outro**: Thank them for their time.
