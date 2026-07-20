# What I Would Do With More Time (Next Week)

If I had one more week to work on the Dev Profile Unifier, my primary goal would be to make the application **incredibly fast** and **easier for the user to interact with**. 

Here is exactly what I would build and why it matters:

## 1. Pre-building Connections (Concurrent Disambiguation)
**The Problem:** Currently, if you search for a common name, the engine might find 30 different GitHub accounts. The user has to guess and click on one *before* the engine goes out and finds their other platforms (like Twitter or StackOverflow). If they click the wrong one, they have to start over.
**The Solution:** I would rebuild the engine so that it instantly finds the connections for *all* 30 accounts at the exact same time behind the scenes. 
**The Why:** By the time the user sees the screen, we wouldn't just show them 30 isolated GitHub names. We would show them fully grouped clusters (e.g., *"Is this you? The Nitesh with this GitHub, this Twitter, and this StackOverflow?"*). This makes the app feel like magic for the user and requires much less guessing.

## 2. Asking for Less Data (GraphQL Migration)
**The Problem:** To get a full picture of a developer from GitHub, our engine currently has to knock on GitHub's door up to 7 different times (once for the profile, 5 times to read all their code repositories, and once for their recent activity). This is a lot of network traffic and burns through our limits quickly.
**The Solution:** I would rewrite the engine to use a technology called **GraphQL**. 
**The Why:** GraphQL allows us to knock on GitHub's door exactly *one* time, and ask for all of that information in a single package. This would drastically speed up the application (saving 2-3 seconds per user) and prevent our servers from ever timing out.

## 3. Background Processing & Live Updates
**The Problem:** Right now, when the engine is doing a really deep search, the user just watches a bouncing dot animation on the screen while they wait for a single, long-running connection to finish. If it takes too long, the browser might give up and drop the connection.
**The Solution:** I would change the architecture so that the heavy work is sent to a background worker (like sending an order to the kitchen). 
**The Why:** This would allow us to stream live updates to the user's screen in real-time (e.g., *"Found GitHub account..." -> "Found 3 Repositories..." -> "Reading StackOverflow answers..."*). It provides a much better experience and ensures the app never crashes from waiting too long.
