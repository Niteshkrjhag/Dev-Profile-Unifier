import React from 'react';

export default function DocsTab() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>Engineering Documentation</h1>
        <p>A high-level overview of the Effiflo Dev Profile Unifier methodology and architecture.</p>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>1. What it is</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>The Dev Profile Unifier</strong> is an automated identity resolution engine. In plain English, it is a system that takes a developer's scattered online footprints (like their GitHub, StackOverflow, and HackerNews accounts) and mathematically proves they belong to the exact same human being, merging them into one unified profile.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>2. Why it exists</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Developers rarely use the same username across all platforms, and they rarely link all their accounts together in one place. Traditional sourcing relies on humans manually Googling names and guessing if "karan123" on GitHub is the same as "karan_dev" on StackOverflow. This system exists to eliminate that manual guesswork, providing recruiters and engineering managers with a perfectly verified, 360-degree view of a developer's actual skills and impact.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--accent-color)' }}>3. How it works (The Resolution Process)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 0: Database Caching</strong><br />
              If we've seen this profile before, we instantly return the unified data from our Supabase PostgreSQL database, saving costly API calls and rendering in milliseconds.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 1: Disambiguation & Smart Caching</strong><br />
              When searching by name, we query multiple platforms and use string matching (like location and workplace) to rank candidates. The results are cached so we don't bombard APIs if you reload the page.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 2: Recursive Graph Crawler</strong><br />
              Once a profile is selected, we parse its raw JSON (bio links, websites) looking for explicit links to other platforms. If found, we recursively fetch them, ensuring 100% deterministic, mathematically proven links.
            </div>
            <div style={{ background: 'rgba(40,199,111,0.05)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--success-color)' }}>
              <strong>Phase 3: LLM Tiebreaker (Heuristic Fallback)</strong><br />
              If platforms are still missing, we use Gemini 3.5 Flash AI to act as a human investigator. We feed it the anchor profile and the missing platform candidates. It looks for nuanced similarities (writing style, tech stack overlaps). Scores &gt;85% are auto-merged, while ambiguous matches are pushed to the Admin Audit console for manual review.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
              <strong>Phase 4: Executive Summary Generation</strong><br />
              Finally, we feed the massively unified data payload back to Gemini to generate a single, highly readable executive summary of the developer's entire career.
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>4. Preventing Identity Collision (Engine Modes)</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The biggest risk in identity resolution across any integrated platform (e.g., GitHub, StackOverflow, Dev.to, HackerNews, etc.) is <strong>Identity Collision</strong>—accidentally merging two different people into the same canonical profile. Our system uses a multi-phase defense to prevent this:
          </p>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px', marginTop: '12px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Phase 0 Hard-Stop:</strong> If a user provides handles that belong to two <i>different</i> known canonical profiles in our database, the engine throws a hard error and aborts to protect data integrity.</li>
            <li style={{ marginBottom: '8px' }}><strong>Strict Mode:</strong> Zero AI allowed. We only link accounts if the Graph Crawler finds a direct hyperlink in their bio. 100% safe and deterministic.</li>
            <li style={{ marginBottom: '8px' }}><strong>Transparent Mode:</strong> Highly manual. If we find multiple potential accounts, we pause and force the user to manually click the correct one via a UI modal.</li>
            <li style={{ marginBottom: '8px' }}><strong>Autonomous Mode:</strong> The LLM reads all candidates and picks the winner. If it gets confused (score &lt; 85%), it falls back to Transparent mode and asks the user.</li>
            <li style={{ marginBottom: '8px' }}><strong>Hybrid Mode (The Sweet Spot):</strong> We use the LLM to guess, but if the LLM gets confused, <i>we don't bother the user with a popup</i>. The engine quietly intercepts the failure, auto-selects the highest-scoring heuristic match from Phase 1, and proceeds.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>5. Benefits</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Extreme Accuracy:</strong> By relying on recursive graph traversal first, we guarantee deterministic links before ever relying on AI guesses.</li>
            <li style={{ marginBottom: '8px' }}><strong>Fault Tolerance:</strong> Deep integration with asyncio guarantees non-blocking execution, while rate limit interceptions prevent infinite retry loops from destroying the server.</li>
            <li style={{ marginBottom: '8px' }}><strong>Human-in-the-Loop (HITL):</strong> The Admin Audit console ensures the AI never makes destructive merges without human oversight on edge cases.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--accent-color)' }}>6. Limitations (Why NOT to use it)</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong>API Rate Limiting:</strong> Free-tier GitHub and StackOverflow APIs aggressively throttle requests. At massive scale, enterprise API tokens are strictly required.</li>
            <li style={{ marginBottom: '8px' }}><strong>LLM Hallucinations:</strong> While the tiebreaker is highly accurate, LLMs can occasionally misinterpret generic tech stacks (e.g., assuming two React developers in London are the same person). This is why the Human-in-the-Loop audit is mandatory for scores under 85%.</li>
            <li style={{ marginBottom: '8px' }}><strong>Context Window Bloat:</strong> Extremely active developers with thousands of repositories can exceed LLM token limits (160k chars), requiring aggressive JSON pruning which risks dropping nuanced data.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
