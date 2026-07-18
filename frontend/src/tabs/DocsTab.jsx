export default function DocsTab() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>Architecture & API</h1>
        <p>Reference documentation for the Effiflo Dev Profile Unifier.</p>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>The Resolution Funnel</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            The API resolves fragmented accounts into a unified Canonical Entity using a tiered system. 
            If exact handles are provided, they are merged deterministically (Tier 1). Otherwise, 
            profiles are fetched based on a cross-platform name search. 
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Ambiguous matches are routed to a Gemini 3.5 Flash LLM (Tier 4) which scores the match.
            Scores &gt; 0.85 are automatically merged. Scores between 0.50 and 0.85 trigger an HTTP 300 
            Multiple Choices response (Approach 2) requiring a human admin override.
          </p>
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
