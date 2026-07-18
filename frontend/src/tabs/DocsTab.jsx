export default function DocsTab() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>Architecture & API</h1>
        <p>Reference documentation for the Effiflo Dev Profile Unifier.</p>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>The 4-Tier Resolution Engine</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Master Data Management (MDM) requires determining if two platform accounts belong to the exact same human. We solve this using a deterministic-to-heuristic funnel:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Tier 1 (Explicit Anchor):</strong> If the user provides an exact platform handle (e.g., github: <code>Niteshkrjhag</code>) in the payload, the system bypasses searching and treats it as a 1.0 confidence match.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Tier 2 (Cross-Pollination):</strong> (Conceptual) Extracting social links explicitly listed on a fetched profile (e.g., a Twitter link found in a GitHub bio) to definitively link the next platform.
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <strong>Tier 3 (Heuristic Overlaps):</strong> (Conceptual) Calculating Levenshtein string distance on names, locations, and intersecting tech stacks before resorting to expensive LLM inference.
            </div>
            <div style={{ background: 'var(--accent-color)', color: 'white', padding: '12px', borderRadius: '8px' }}>
              <strong>Tier 4 (LLM Semantic Judge):</strong> For ambiguous name-based searches, the raw JSON of the candidate profile is passed alongside our anchor data to <code>Gemini 3.5 Flash</code>. The LLM acts as a tie-breaker, analyzing nuanced signals (writing style, repo activity).
              <ul style={{ paddingLeft: '20px', marginTop: '8px', opacity: 0.9 }}>
                <li><strong>&gt; 0.85:</strong> Auto-merged.</li>
                <li><strong>0.50 - 0.85:</strong> Halted & marked <code>pending_review</code> (Requires Admin Audit).</li>
                <li><strong>&lt; 0.50:</strong> Rejected.</li>
              </ul>
            </div>
          </div>
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
