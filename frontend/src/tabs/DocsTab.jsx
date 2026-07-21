import React from 'react';

export default function DocsTab() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>Engineering Documentation</h1>
        <p>A quick breakdown of how the Dev Profile Unifier actually works under the hood.</p>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>1. What this actually is</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Basically, it's an automated identity resolution engine. We take a developer's scattered footprints across different platforms (GitHub, StackOverflow, HackerNews, Dev.to, etc.) and programmatically prove they belong to the exact same human being, rolling them up into one canonical profile.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>2. Why we built it</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Developers almost never use the exact same username everywhere, and they rarely link all their accounts together. Normally, sourcers have to manually Google names and guess if "karan123" on GitHub is the same person as "karan_dev" on StackOverflow. We built this pipeline to completely automate that guesswork so you get a verified, 360-degree view of a dev's actual skill tree without the manual labor.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--accent-color)' }}>3. How the Pipeline Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 0: Database Caching</strong><br />
              Before we even touch an external API, we hit our Supabase DB. If we've already resolved this person, we just pull the cached canonical profile and render it in milliseconds.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 1: Disambiguation</strong><br />
              If you just search a common name, we concurrently query the platforms and use lightweight string matching (like checking their location or workplace) to rank the top candidates. We cache this so we don't spam the APIs on page reloads.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 2: Graph Crawler (Deterministic)</strong><br />
              Once we have a base profile (usually GitHub), we scrape the raw JSON for bio links, personal websites, or Twitter handles. If we find a literal URL pointing to another platform, we follow it. This gives us a 100% deterministic, mathematically proven link.
            </div>
            <div style={{ background: 'rgba(40,199,111,0.05)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--success-color)' }}>
              <strong>Phase 3: LLM Tiebreaker (Probabilistic)</strong><br />
              If their bio is empty, we fall back to AI. We dump the JSON of the base profile and the missing platform candidates into Gemini 3.5 Flash. It acts like a human investigator, comparing tech stacks and repos. High scores (&gt;85%) get auto-merged, low scores get pushed to the Admin console for a human to review.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 4: Executive Summary</strong><br />
              Finally, we feed the massively unified payload back to the LLM to generate a quick, readable summary of their entire career.
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>4. Preventing Identity Collision (Engine Modes)</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The biggest headache when pulling profiles across different platforms (GitHub, StackOverflow, Dev.to, HackerNews, etc.) is <strong>Identity Collision</strong>—basically, merging Jane's GitHub with John's StackOverflow by accident and corrupting the canonical profile. To prevent this, we built a few fallback layers:
          </p>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px', marginTop: '12px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Phase 0 Hard-Stop:</strong> If someone explicitly passes in handles that already map to two <i>different</i> people in our DB, we immediately throw an error and abort. We never silently merge them.</li>
            <li style={{ marginBottom: '8px' }}><strong>Strict Mode:</strong> No AI involved. We only link accounts if we find a literal URL pointing to it in their bio (like a Twitter link in a GitHub readme). It's 100% deterministic and safe.</li>
            <li style={{ marginBottom: '8px' }}><strong>Transparent Mode:</strong> Pure human-in-the-loop. If we get multiple hits for a name search, we pause the pipeline and pop up a modal asking the user to manually pick the right one.</li>
            <li style={{ marginBottom: '8px' }}><strong>Autonomous Mode:</strong> We dump the candidate JSONs into the LLM and let it guess. If the AI isn't super confident (score &lt; 85%), it bails out and falls back to Transparent mode.</li>
            <li style={{ marginBottom: '8px' }}><strong>Hybrid Mode:</strong> This is what we use to prevent UI fatigue. The LLM tries to guess, but if it gets confused, instead of bothering the user with a popup, the backend just quietly takes the top heuristic match from Phase 1 and moves on.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>5. Why this architecture rocks</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Safety First:</strong> By forcing the Graph Crawler to run first, we guarantee deterministic links before we ever let the AI start guessing.</li>
            <li style={{ marginBottom: '8px' }}><strong>Async Everything:</strong> The FastAPI backend uses heavily integrated `asyncio` to fetch all these APIs concurrently, so the whole resolution process doesn't block.</li>
            <li style={{ marginBottom: '8px' }}><strong>Human-in-the-Loop (HITL):</strong> The Admin Audit console means the AI can never permanently trash our Star Schema database without a human signing off on edge cases.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>6. The Catch (Limitations)</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong>API Rate Limiting:</strong> Free-tier APIs aggressively throttle us. If you want to run this at enterprise scale, you absolutely need paid API tokens.</li>
            <li style={{ marginBottom: '8px' }}><strong>LLM Hallucinations:</strong> The tiebreaker is great, but LLMs can sometimes get tricked by generic tech stacks (e.g., assuming two React devs in London are the same person). That's why the Admin Audit is mandatory.</li>
            <li style={{ marginBottom: '8px' }}><strong>Context Window Bloat:</strong> If a dev has thousands of repos, their JSON payload can blow up the LLM token limits (160k chars), meaning we have to aggressively prune the JSON and might lose nuanced data.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
