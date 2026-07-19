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
      A[Client Request] --> B{Handle Provided?}
      
      B -- Yes --> C[Phase 0: DB Cache Check]
      
      B -- No --> D1[Phase 1: Hash Metadata]
      D1 --> D2{In Cache?}
      D2 -- Yes --> E[Return Cached Choices]
      D2 -- No --> D3[Fetch APIs & Rank]
      D3 --> E
      E --> F[User Selects Match]
      F --> C
      
      C --> G{In DB?}
      G -- Yes --> H[Return Profile]
      G -- No --> I[Phase 2: Graph Crawler]
      
      I --> J[Fetch Profiles]
      J --> K[Parse Bio Links]
      K --> L{New Links?}
      L -- Yes --> J
      
      L -- No --> M[Phase 3: Fallback Search]
      M --> N{Missing?}
      
      N -- Yes --> O[Gemini Tiebreaker]
      O -->|Score > 0.85| Q[Auto-Merge]
      O -->|Score > 0.50| R[Pending Audit]
      O -->|Score < 0.50| S[Rejected]
      
      N -- No --> T[Phase 4: LLM Summary]
      Q --> T
      T --> H
  `;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>End-to-End Architecture</h1>
        <p>A comprehensive guide to how the Effiflo Dev Profile Unifier resolves identities.</p>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>The 5-Phase Resolution Engine</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
            Identity resolution requires confirming that two disparate digital footprints belong to the exact same human. We solve this using a multi-phase deterministic-to-heuristic engine.
          </p>
          
          <MermaidDiagram chart={diagram} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 0 (Database Cache):</strong> If explicit handles are provided, we immediately check our canonical database. If the identity was previously resolved, we skip all network calls and return the unified profile in milliseconds.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 1 (Disambiguation & Smart Caching):</strong> If only a Name and Metadata (Location, Workplace) are provided, we hash the inputs. If this exact search exists in our cache, we return the options instantly. If not, we fetch candidates from GitHub and StackOverflow, rank them based on bio metadata matches, save the results to the cache, and present the choices to the human user.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 2 (Recursive Graph Crawler):</strong> Starting from the anchor profile, the system scans raw JSON (websites, bio links, blog URLs) using regex. If a cross-link is found (e.g., a Dev.to link on GitHub), we recursively fetch that new profile. This loop exhausts the deterministic graph.
            </div>
            <div style={{ background: 'var(--accent-color)', color: 'white', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 3 (Gemini Tiebreaker):</strong> For any platforms still missing, we perform a fallback heuristic search. The raw JSON of the newly found profile is sent alongside our anchor profile to the LLM. Gemini analyzes signals like repo activity and writing style to score the match. Scores &gt;0.85 are auto-merged; scores &gt;0.50 are flagged for human audit.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Phase 4 (Executive Summary):</strong> Once all platforms are verified, the unified data payload is sent to Gemini one last time to generate a professional, cohesive summary of the developer's entire career and impact.
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
            <li style={{ marginBottom: '8px' }}><strong>10-Second Strict Timeouts:</strong> Prevents our server from freezing if external APIs go offline.</li>
            <li style={{ marginBottom: '8px' }}><strong>Rate Limit Protection:</strong> Explicitly intercepts HTTP 429 and StackOverflow "backoff" requests, instantly halting crawls and informing the frontend rather than swallowing the error.</li>
            <li style={{ marginBottom: '8px' }}><strong>Automated Cron Jobs:</strong> A background loop runs every 12 hours to auto-delete Phase 1 caches older than 3 days, ensuring candidate lists never get stale.</li>
            <li style={{ marginBottom: '8px' }}><strong>LLM Markdown Stripping:</strong> A custom regex cleans Gemini JSON outputs, preventing critical tiebreaker crashes if the AI hallucinates markdown formatting.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
