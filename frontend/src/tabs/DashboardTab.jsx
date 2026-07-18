import { useState } from 'react';

export default function DashboardTab() {
  const [formData, setFormData] = useState({ name: '', github: '', stackoverflow: '', devto: '', hackernews: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('http://localhost:8080/profiles/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Resolution failed');
      
      if (data.status === 'multiple_choices') {
        setResult({ type: 'disambiguation', data });
      } else {
        setResult({ type: 'success', data });
        fetchCanonical(data.canonical_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCanonical = async (id) => {
    try {
      const res = await fetch(`http://localhost:8080/profiles/${id}`);
      const profile = await res.json();
      setResult(prev => ({ ...prev, profile }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>Profile Discovery</h1>
        <p>Enter a developer's information to ingest, resolve, and unify their footprint.</p>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Full Name (Mandatory)</label>
              <input 
                required 
                placeholder="e.g. Karan Maheswari" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.1)', margin: '8px 0' }}></div>
            <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>OPTIONAL EXACT HANDLES</p>
            
            <input placeholder="GitHub Handle" value={formData.github} onChange={(e) => setFormData({...formData, github: e.target.value})} />
            <input placeholder="StackOverflow Handle or ID" value={formData.stackoverflow} onChange={(e) => setFormData({...formData, stackoverflow: e.target.value})} />
            <input placeholder="Dev.to Username" value={formData.devto} onChange={(e) => setFormData({...formData, devto: e.target.value})} />
            <input placeholder="HackerNews Handle" value={formData.hackernews} onChange={(e) => setFormData({...formData, hackernews: e.target.value})} />
            
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? 'Running Resolution Engine...' : 'Search & Unify'}
            </button>
          </form>

          {error && <div style={{ color: 'var(--danger-color)', marginTop: '16px', padding: '12px', background: 'rgba(255,59,48,0.1)', borderRadius: '8px' }}>{error}</div>}
        </div>

        <div style={{ flex: 1 }}>
          {result?.type === 'success' && result.profile && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <h2>Unified Profile</h2>
              <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.03)', padding: '16px', borderRadius: '12px' }}>
                <h3>LLM Executive Summary</h3>
                <p style={{ marginTop: '8px', color: 'var(--text-primary)' }}>{result.profile.llm_summary}</p>
              </div>
              
              <h3 style={{ marginTop: '24px' }}>Confirmed Links</h3>
              <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
                {result.profile.entity_links.map((link, idx) => (
                  <li key={idx} style={{ marginBottom: '8px' }}>
                    <strong>{link.raw_profiles.platform}</strong> ({link.raw_profiles.handle}) - Confidence: {link.confidence_score}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result?.type === 'disambiguation' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', border: '1px solid #FFCC00' }}>
              <h2>⚠️ Multiple Choices Detected</h2>
              <p style={{ marginBottom: '16px' }}>The LLM Engine was not highly confident (Score &lt; 0.85) about these profiles. Please manually review them in the Admin Tab.</p>
              {result.data.candidates.map((c, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <strong>{c.platform}:</strong> {c.handle} (Confidence: {c.confidence})
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{c.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
