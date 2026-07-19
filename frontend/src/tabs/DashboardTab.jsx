import { useState } from 'react';

export default function DashboardTab() {
  const [formData, setFormData] = useState({ 
    name: '', github: '', stackoverflow: '', devto: '', hackernews: '',
    location: '', workplace: '', gender: '', profession_status: '' 
  });
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

  const handleSelectCandidate = async (platform, handle) => {
    const updatedFormData = { ...formData, [platform]: handle };
    setFormData(updatedFormData);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('http://localhost:8080/profiles/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFormData)
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

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>Advanced Profile Discovery</h1>
        <p>Enter a developer's information and metadata to accurately resolve their identity.</p>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        <div style={{ flex: 1, maxWidth: '450px' }}>
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
            <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>OPTIONAL METADATA</p>
            
            <input placeholder="Location (e.g. San Francisco)" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
            <input placeholder="Workplace / Company" value={formData.workplace} onChange={(e) => setFormData({...formData, workplace: e.target.value})} />
            
            <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)', width: '100%' }}>
              <option value="">Select Gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="status" value="student" checked={formData.profession_status === 'student'} onChange={(e) => setFormData({...formData, profession_status: e.target.value})} />
                Student
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="status" value="professional" checked={formData.profession_status === 'professional'} onChange={(e) => setFormData({...formData, profession_status: e.target.value})} />
                Working Professional
              </label>
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
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', border: '1px solid #FFCC00', display: 'flex', flexDirection: 'column', maxHeight: '850px' }}>
              <h2>⚠️ Multiple Choices Detected</h2>
              <p style={{ marginBottom: '16px' }}>
                {result.data.message || 'Multiple profiles match this identity. Please select the correct one or review pending links in the Admin Tab.'}
              </p>
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                {result.data.candidates.map((c, i) => {
                const profile = c.data?.profile || {};
                const profileUrl = c.platform === 'github' ? profile.html_url : profile.link;
                const bioText = profile.bio || profile.about_me || '';
                const locationText = profile.location || '';
                const companyText = profile.company || '';
                const reputation = profile.reputation || null;

                return (
                  <div key={i} style={{ 
                    background: c.match_score > 0 ? 'rgba(40,199,111,0.1)' : 'rgba(0,0,0,0.03)', 
                    border: c.match_score > 0 ? '1px solid var(--success-color)' : 'none',
                    padding: '16px', 
                    borderRadius: '8px', 
                    marginBottom: '12px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '1.05rem', textTransform: 'capitalize' }}>{c.platform}: </strong> 
                        {profileUrl ? (
                          <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--accent-color)', textDecoration: 'underline' }}>
                            {c.handle} ↗
                          </a>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{c.handle}</span>
                        )}
                        {c.confidence !== undefined && <span style={{marginLeft: '8px', fontSize: '0.9rem'}}>(Confidence: {c.confidence})</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {c.match_score > 0 && (
                          <span style={{ background: 'var(--success-color)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                            Metadata Match!
                          </span>
                        )}
                        <button 
                          onClick={() => handleSelectCandidate(c.platform, c.handle)}
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          Select & Crawl
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {profile.name && (
                        <span style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                          Name: {profile.name}
                        </span>
                      )}
                      {locationText && (
                        <span style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                          📍 {locationText}
                        </span>
                      )}
                      {companyText && (
                        <span style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                          🏢 {companyText}
                        </span>
                      )}
                      {reputation !== null && (
                        <span style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                          ⭐ Rep: {reputation}
                        </span>
                      )}
                    </div>

                    {bioText && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic', background: 'rgba(255,255,255,0.4)', padding: '8px', borderRadius: '6px' }}>
                        "{bioText.replace(/<[^>]*>/g, '')}"
                      </p>
                    )}

                    {c.reason && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--danger-color)', marginTop: '8px', fontWeight: 500 }}>
                        Reason: {c.reason}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
