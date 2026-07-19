import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

function MermaidDiagram({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      try {
        mermaid.render('mermaid-svg-' + Math.random().toString(36).substring(7), chart).then((result) => {
          ref.current.innerHTML = result.svg;
        }).catch(e => console.error("Mermaid error:", e));
      } catch (e) {
        console.error("Mermaid sync error:", e);
      }
    }
  }, [chart]);

  return <div ref={ref} className="mermaid-container" style={{ display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.15)', padding: '24px', borderRadius: '12px', marginTop: '16px' }} />;
}

export default function DocsTab() {
  const diagram = `
    graph TD
      A[Client Request] --> B{Exact Handles Provided?}
      B -- No --> C1[Hash: Name + Location + Workplace]
      C1 --> C2{Exists in Cache?}
      C2 -- Yes --> D[Return 300 Cached Choices]
      C2 -- No --> C3[Fetch APIs & Save to Cache]
      C3 --> D
      D --> E[User Selects Match]
      
      B -- Yes --> F[Phase 0: DB Check]
      E --> F
      
      F --> G{Exists in DB?}
      G -- Yes --> H[Return Profile]
      G -- No --> I[Phase 2: Graph Crawler]
      
      I --> J[Fetch Profiles]
      J --> K[Parse Bio for Links]
      K --> L{New Links?}
      L -- Yes --> J
      
      L -- No --> M[Phase 3a: Deterministic]
      M --> N{Missing Platforms?}
      
      N -- Yes --> O[Phase 3b: Fallback Search]
      O --> P[Gemini Tiebreaker]
      P -->|> 0.85| Q[Auto-Merge]
      P -->|> 0.50| R[Pending Audit]
      P -->|< 0.50| S[Rejected]
      
      N -- No --> T[Phase 4: LLM Summary]
      Q --> T
      T --> H
  `;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>Architecture & API</h1>
        <p>Reference documentation for the Effiflo Dev Profile Unifier.</p>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>The Iterative Graph Crawler Pipeline</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
            Master Data Management (MDM) requires determining if two platform accounts belong to the exact same human. We solve this using a multi-phase deterministic-to-heuristic engine that recursively maps a developer's digital footprint.
          </p>
          
          <MermaidDiagram chart={diagram} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 1a (Smart Caching & Disambiguation):</strong> If only a name and metadata (Location, Workplace, etc.) are provided, we hash these exact inputs. We check our Database Cache to prevent redundant API calls. If missing, we fetch from GitHub and StackOverflow, rank them using the metadata, save them to the cache, and present the choices to the user. A background <strong>Cron Job</strong> runs every 12 hours to auto-delete caches older than 3 days, ensuring data never gets stale.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 2 (Graph Crawler):</strong> We fetch the initial profile and scan its raw JSON (bio, website, blog links) using regex. If we find a cross-link (e.g. <code>dev.to/nitesh_jha</code> on GitHub), we recursively fetch that new profile. This loops up to 3 times to exhaust the graph deterministicly.
            </div>
            <div style={{ background: 'var(--accent-color)', color: 'white', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 3 (LLM Tiebreaker):</strong> For any platforms still missing after the deterministic crawl, we perform a fallback name search. The raw JSON of the candidate profile is passed alongside our anchor data to Gemini. The LLM acts as a tie-breaker, analyzing nuanced signals (writing style, repo activity).
            </div>
          </div>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)' }} />

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Fault Tolerance & Reliability</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
            The API is engineered to handle massive scale without silently failing.
          </p>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong>10-Second Strict Timeouts:</strong> Prevents our server from freezing if external APIs (like dev.to or HackerNews) go offline.</li>
            <li style={{ marginBottom: '8px' }}><strong>Rate Limit Protection:</strong> Explicitly intercepts HTTP 429 and StackOverflow "backoff" requests, instantly halting crawls and informing the frontend rather than pretending the user doesn't exist.</li>
            <li style={{ marginBottom: '8px' }}><strong>LLM Markdown Stripping:</strong> A custom regex cleans Gemini JSON outputs, preventing critical tiebreaker crashes if the AI hallucinates markdown formatting.</li>
          </ul>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)' }} />

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Core Endpoints</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ background: 'var(--success-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>POST</span>
              <code style={{ fontSize: '1.1rem', fontWeight: 500 }}>/profiles/resolve</code>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Accepts a JSON payload with a mandatory <code>name</code> and optional handles. Returns a <code>canonical_id</code> or a list of multiple choices if disambiguation is required.</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ background: 'var(--accent-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>GET</span>
              <code style={{ fontSize: '1.1rem', fontWeight: 500 }}>/profiles/&#123;id&#125;</code>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Fetches the full unified profile, including the LLM executive summary and all confirmed cross-platform entity links.</p>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ background: 'var(--accent-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>GET</span>
              <code style={{ fontSize: '1.1rem', fontWeight: 500 }}>/health</code>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Returns real-time observability metrics including API usage, LLM token burn, estimated cost, and average resolution latency.</p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ background: '#FF9500', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>PUT</span>
              <code style={{ fontSize: '1.1rem', fontWeight: 500 }}>/admin/links/&#123;canonical_id&#125;/&#123;raw_id&#125;</code>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Admin route to override a pending link status to <code>confirmed</code> or <code>rejected</code>.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
