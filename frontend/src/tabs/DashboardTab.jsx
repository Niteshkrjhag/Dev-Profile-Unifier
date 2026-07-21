import { useState, useEffect } from 'react';

const LoadingState = () => {
  const [message, setMessage] = useState("Querying external developer platforms...");

  const messages = [
    "Querying external developer platforms...",
    "Crawling cross-platform social graphs...",
    "Running LLM semantic resolution...",
    "Structuring canonical identity...",
    "Finalizing response..."
  ];

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessage(prev => {
        const idx = messages.indexOf(prev);
        return messages[(idx + 1) % messages.length];
      });
    }, 4000);
    return () => clearInterval(msgInterval);
  }, []);

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '60px 40px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', height: '60px', marginBottom: '32px' }}>
        <div className="bouncing-dot" style={{ animationDelay: '0s' }}></div>
        <div className="bouncing-dot" style={{ animationDelay: '0.2s' }}></div>
        <div className="bouncing-dot" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <h2 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Unifying Identity...</h2>
      <p style={{ color: 'var(--accent-color)', fontWeight: '500', minHeight: '24px', transition: 'opacity 0.3s' }}>
        {message}
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '16px' }}>
        This process involves deep cross-platform crawling and may take a moment.
      </p>
      <style>{`
        .bouncing-dot {
          width: 16px;
          height: 16px;
          background-color: var(--accent-color);
          border-radius: 50%;
          animation: bounce 0.6s infinite alternate cubic-bezier(0.5, 0.05, 1, 0.5);
        }
        @keyframes bounce {
          to {
            transform: translateY(-20px);
            opacity: 0.6;
            background-color: #00b4d8;
          }
        }
      `}</style>
    </div>
  );
};

export default function DashboardTab() {
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('effiflo_formData');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      name: parsed.name || '', github: parsed.github || '', stackoverflow: parsed.stackoverflow || '', devto: parsed.devto || '', hackernews: parsed.hackernews || '',
      location: parsed.location || '', workplace: parsed.workplace || '', gender: parsed.gender || '', profession_status: parsed.profession_status || '',
      mode: parsed.mode || 'hybrid', depth: parsed.depth || 'lighter'
    };
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    const saved = sessionStorage.getItem('effiflo_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('effiflo_formData', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (result) {
      sessionStorage.setItem('effiflo_result', JSON.stringify(result));
    } else {
      sessionStorage.removeItem('effiflo_result');
    }
  }, [result]);

  const buildApiPayload = (data) => {
    const handles = {};
    if (data.github) handles.github = data.github;
    if (data.stackoverflow) handles.stackoverflow = data.stackoverflow;
    if (data.devto) handles.devto = data.devto;
    if (data.hackernews) handles.hackernews = data.hackernews;

    const user_metadata = {};
    if (data.location) user_metadata.location = data.location;
    if (data.workplace) user_metadata.workplace = data.workplace;
    if (data.gender) user_metadata.gender = data.gender;
    if (data.profession_status) user_metadata.profession_status = data.profession_status;

    return {
      name: data.name,
      mode: data.mode,
      fallback_disambiguation: data.fallback_disambiguation || false,
      handles,
      user_metadata
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    sessionStorage.removeItem('effiflo_debug_data');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/profiles/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildApiPayload(formData))
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Resolution failed');

      if (data.debug_data) {
        sessionStorage.setItem('effiflo_debug_data', JSON.stringify(data.debug_data));
      }

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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/profiles/${id}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to fetch canonical profile');
      }
      const profile = await res.json();
      setResult(prev => ({ ...prev, profile }));
    } catch (err) {
      console.error(err);
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCandidate = (platform, handle) => {
    setSelectedCandidates(prev => {
      const newSel = { ...prev };
      if (newSel[platform] === handle) {
        delete newSel[platform]; // toggle off
      } else {
        newSel[platform] = handle; // toggle on (replaces previous choice for this platform)
      }
      return newSel;
    });
  };

  const handleProceedWithSelected = async () => {
    if (Object.keys(selectedCandidates).length === 0) return;
    
    const updatedFormData = { ...formData, ...selectedCandidates, fallback_disambiguation: true };
    setFormData(updatedFormData);
    setSelectedCandidates({});
    
    setLoading(true);
    setError(null);
    setResult(null);
    sessionStorage.removeItem('effiflo_debug_data');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/profiles/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildApiPayload(updatedFormData))
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Resolution failed');

      if (data.debug_data) {
        sessionStorage.setItem('effiflo_debug_data', JSON.stringify(data.debug_data));
      }

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

  const handleSkip = () => {
    if (result.data.canonical_id) {
      setResult({ type: 'success', data: result.data });
      fetchCanonical(result.data.canonical_id);
    }
  };

  const handleSelectCandidate = async (platform, handle) => {
    const updatedFormData = { ...formData, [platform]: handle };
    setFormData(updatedFormData);
    setLoading(true);
    setError(null);
    setResult(null);
    sessionStorage.removeItem('effiflo_debug_data');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/profiles/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildApiPayload(updatedFormData))
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Resolution failed');

      if (data.debug_data) {
        sessionStorage.setItem('effiflo_debug_data', JSON.stringify(data.debug_data));
      }

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

  useEffect(() => {
    if (result?.type === 'disambiguation') {
      const candidates = result.data.candidates || [];
      const exactMatches = candidates.filter(c => c.match_score > 0);
      if (exactMatches.length === 1) {
        const match = exactMatches[0];
        setCountdown(3);
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              handleSelectCandidate(match.platform, match.handle);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(interval);
      }
    }
  }, [result]);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Advanced Profile Discovery</h1>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Enter a developer's information and metadata to accurately resolve their identity.</p>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.2)', 
            color: 'var(--text-primary)', 
            padding: '10px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontWeight: 600,
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <span>⚙️</span> Configure Engine
        </button>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        <div style={{ flex: 1, maxWidth: '450px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 500 }}>Full Name (Mandatory)</label>
              <input
                required
                placeholder="e.g. Karan Maheswari"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ padding: '8px 12px' }}
              />
            </div>

            <div style={{ height: '1px', background: 'rgba(0,0,0,0.1)', margin: '4px 0' }}></div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>OPTIONAL METADATA</p>

            <input placeholder="Location (e.g. San Francisco)" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ padding: '8px 12px' }} />
            <input placeholder="Workplace / Company" value={formData.workplace} onChange={(e) => setFormData({ ...formData, workplace: e.target.value })} style={{ padding: '8px 12px' }} />

            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)', width: '100%' }}>
              <option value="">Select Gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="status" value="student" checked={formData.profession_status === 'student'} onChange={(e) => setFormData({ ...formData, profession_status: e.target.value })} />
                Student
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="status" value="professional" checked={formData.profession_status === 'professional'} onChange={(e) => setFormData({ ...formData, profession_status: e.target.value })} />
                Working Professional
              </label>
            </div>

            <div style={{ height: '1px', background: 'rgba(0,0,0,0.1)', margin: '4px 0' }}></div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>OPTIONAL EXACT HANDLES</p>

            <input placeholder="GitHub Handle" value={formData.github} onChange={(e) => setFormData({ ...formData, github: e.target.value })} style={{ padding: '8px 12px' }} />
            <input placeholder="StackOverflow Handle or ID" value={formData.stackoverflow} onChange={(e) => setFormData({ ...formData, stackoverflow: e.target.value })} style={{ padding: '8px 12px' }} />
            <input placeholder="Dev.to Username" value={formData.devto} onChange={(e) => setFormData({ ...formData, devto: e.target.value })} style={{ padding: '8px 12px' }} />
            <input placeholder="HackerNews Handle" value={formData.hackernews} onChange={(e) => setFormData({ ...formData, hackernews: e.target.value })} style={{ padding: '8px 12px' }} />

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px', padding: '10px' }}>
              {loading ? 'Running Resolution Engine...' : 'Search & Unify'}
            </button>
          </form>

          {error && <div style={{ color: 'var(--danger-color)', marginTop: '16px', padding: '12px', background: 'rgba(255,59,48,0.1)', borderRadius: '8px' }}>{error}</div>}
        </div>

        <div style={{ flex: 1 }}>
          {loading && <LoadingState />}
          
          {!loading && result?.type === 'success' && result.profile && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <h2>Unified Profile</h2>
              <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.03)', padding: '16px', borderRadius: '12px' }}>
                <h3>LLM Executive Summary</h3>
                <p style={{ marginTop: '8px', color: 'var(--text-primary)' }}>{result.profile.llm_summary}</p>
              </div>

              <h3 style={{ marginTop: '24px' }}>Confirmed Links</h3>
              <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
                {result.profile.entity_links.map((link, idx) => {
                  const plat = link.raw_profiles.platform;
                  const handle = link.raw_profiles.handle;
                  let url = '';
                  if (plat === 'github') url = `https://github.com/${handle}`;
                  if (plat === 'stackoverflow') url = `https://stackoverflow.com/users/${handle}`;
                  if (plat === 'devto') url = `https://dev.to/${handle}`;
                  if (plat === 'hackernews') url = `https://news.ycombinator.com/user?id=${handle}`;

                  return (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                      <strong style={{ textTransform: 'capitalize' }}>{plat}</strong>:{' '}
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
                          {handle} ↗
                        </a>
                      ) : (
                        <span>{handle}</span>
                      )}
                      <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
                        (Confidence: {link.confidence_score})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!loading && result?.type === 'disambiguation' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', border: '1px solid #FFCC00', display: 'flex', flexDirection: 'column', maxHeight: '850px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>⚠️ Multiple Choices Detected</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => {
                    setResult(null);
                    setSelectedCandidates({});
                  }} 
                  style={{ background: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel / Clear
                </button>
              </div>
              </div>
              <p style={{ marginBottom: '16px', marginTop: '8px' }}>
                {result.data.message || 'Multiple profiles match this identity. Please select the correct one(s) or skip.'}
              </p>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleProceedWithSelected}
                  disabled={Object.keys(selectedCandidates).length === 0}
                  className="btn-primary"
                  style={{ opacity: Object.keys(selectedCandidates).length === 0 ? 0.5 : 1, cursor: Object.keys(selectedCandidates).length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Proceed with Selected ({Object.keys(selectedCandidates).length})
                </button>
                {result.data.canonical_id && (
                  <button
                    onClick={handleSkip}
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Skip & View Profile
                  </button>
                )}
              </div>

              {result.data.candidates.filter(c => c.match_score > 0).length === 1 && countdown !== null && (
                <div style={{ background: 'rgba(40,199,111,0.1)', border: '1px solid var(--success-color)', padding: '8px 12px', borderRadius: '6px', marginBottom: '16px', color: 'var(--success-color)', fontWeight: 600 }}>
                  Exact Match found! Auto-selecting in {countdown} seconds...
                </div>
              )}
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                {result.data.candidates.map((c, i) => {
                  const profile = c.data?.profile || {};
                  
                  // Hackernews doesn't provide a direct link in the API payload
                  let profileUrl = '';
                  if (c.platform === 'github') profileUrl = profile.html_url;
                  else if (c.platform === 'hackernews') profileUrl = `https://news.ycombinator.com/user?id=${c.handle}`;
                  else profileUrl = profile.link || profile.url;

                  // Dev.to API returns bio inside 'summary'
                  const bioText = profile.bio || profile.about_me || profile.summary || '';
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
                          {c.confidence !== undefined && <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>(Confidence: {c.confidence})</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {c.match_score > 0 && (
                            <span style={{ background: 'var(--success-color)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                              Metadata Match!
                            </span>
                          )}
                          <button
                            onClick={() => handleToggleCandidate(c.platform, c.handle)}
                            style={{ 
                              padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
                              background: selectedCandidates[c.platform] === c.handle ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                              color: selectedCandidates[c.platform] === c.handle ? '#fff' : 'var(--text-primary)',
                              border: 'none', transition: 'all 0.2s'
                            }}
                          >
                            {selectedCandidates[c.platform] === c.handle ? 'Selected ✓' : 'Select'}
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

      {/* Premium Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsSettingsOpen(false)}>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', width: '90%', maxWidth: '600px', animation: 'fadeInUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: '#111', fontSize: '1.4rem' }}>⚙️ Engine Configuration</h2>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Operational Mode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div 
                  onClick={() => { if(formData.depth !== 'lighter') setFormData({...formData, mode: 'strict'}) }}
                  style={{ padding: '12px', borderRadius: '12px', border: formData.mode === 'strict' ? '2px solid #333' : '1px solid rgba(0,0,0,0.1)', background: formData.mode === 'strict' ? 'rgba(0,0,0,0.05)' : '#f8f9fa', cursor: formData.depth === 'lighter' ? 'not-allowed' : 'pointer', opacity: formData.depth === 'lighter' ? 0.5 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                >
                  <input type="radio" checked={formData.mode === 'strict'} readOnly style={{ accentColor: '#333', marginTop: '4px' }} />
                  <div>
                    <strong style={{ color: formData.mode === 'strict' ? '#333' : '#333', display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Strict (Exact Match Only)</strong>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: '1.4' }}>
                      Rely strictly on exact handles and graph-crawled profiles. If missing, do not search by name. Zero LLM tokens wasted.
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => { if(formData.depth !== 'lighter') setFormData({...formData, mode: 'transparent'}) }}
                  style={{ padding: '12px', borderRadius: '12px', border: formData.mode === 'transparent' ? '2px solid var(--success-color)' : '1px solid rgba(0,0,0,0.1)', background: formData.mode === 'transparent' ? 'rgba(40,199,111,0.05)' : '#f8f9fa', cursor: formData.depth === 'lighter' ? 'not-allowed' : 'pointer', opacity: formData.depth === 'lighter' ? 0.5 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                >
                  <input type="radio" checked={formData.mode === 'transparent'} readOnly style={{ accentColor: 'var(--success-color)', marginTop: '4px' }} />
                  <div>
                    <strong style={{ color: formData.mode === 'transparent' ? 'var(--success-color)' : '#333', display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Transparent (Manual Fallback)</strong>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: '1.4' }}>
                      Perform name search for missing platforms and pause engine for manual UI verification. Zero LLM tokens wasted.
                    </p>
                  </div>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, mode: 'autonomous'})}
                  style={{ padding: '12px', borderRadius: '12px', border: formData.mode === 'autonomous' ? '2px solid var(--accent-color)' : '1px solid rgba(0,0,0,0.1)', background: formData.mode === 'autonomous' ? 'rgba(115,103,240,0.05)' : '#f8f9fa', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                >
                  <input type="radio" checked={formData.mode === 'autonomous'} readOnly style={{ accentColor: 'var(--accent-color)', marginTop: '4px' }} />
                  <div>
                    <strong style={{ color: formData.mode === 'autonomous' ? 'var(--accent-color)' : '#333', display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Autonomous (AI Fallback)</strong>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: '1.4' }}>
                      Perform name search and send candidates to LLM to automatically tiebreak. Highly efficient but uses LLM tokens.
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => setFormData({...formData, mode: 'hybrid'})}
                  style={{ padding: '12px', borderRadius: '12px', border: formData.mode === 'hybrid' ? '2px solid #FF9F43' : '1px solid rgba(0,0,0,0.1)', background: formData.mode === 'hybrid' ? 'rgba(255,159,67,0.05)' : '#f8f9fa', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                >
                  <input type="radio" checked={formData.mode === 'hybrid'} readOnly style={{ accentColor: '#FF9F43', marginTop: '4px' }} />
                  <div>
                    <strong style={{ color: formData.mode === 'hybrid' ? '#FF9F43' : '#333', display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Hybrid (AI Anchor + Strict Crawler)</strong>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: '1.4' }}>
                      Uses AI to resolve the initial name search, but strictly relies on exact bio links for other platforms (skips fallback guessing). Fast & deterministic.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Crawl Depth Limit</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div 
                  onClick={() => setFormData({...formData, depth: 'lighter', mode: 'autonomous'})}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: formData.depth === 'lighter' ? '2px solid #333' : '1px solid rgba(0,0,0,0.1)', background: formData.depth === 'lighter' ? 'rgba(0,0,0,0.03)' : '#f8f9fa', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                >
                  <strong style={{ fontSize: '0.95rem', color: '#333', marginBottom: '4px' }}>Lighter</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '6px' }}>1 Iteration</div>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: 0, lineHeight: '1.3', flex: 1 }}>Fastest search. Forces Autonomous Mode.</p>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, depth: 'normal'})}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: formData.depth === 'normal' ? '2px solid #333' : '1px solid rgba(0,0,0,0.1)', background: formData.depth === 'normal' ? 'rgba(0,0,0,0.03)' : '#f8f9fa', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                >
                  <strong style={{ fontSize: '0.95rem', color: '#333', marginBottom: '4px' }}>Normal</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '6px' }}>3 Iterations</div>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: 0, lineHeight: '1.3', flex: 1 }}>Standard depth. Balances speed with thoroughness.</p>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, depth: 'deeper'})}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: formData.depth === 'deeper' ? '2px solid #333' : '1px solid rgba(0,0,0,0.1)', background: formData.depth === 'deeper' ? 'rgba(0,0,0,0.03)' : '#f8f9fa', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                >
                  <strong style={{ fontSize: '0.95rem', color: '#333', marginBottom: '4px' }}>Deeper</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '6px' }}>5 Iterations</div>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: 0, lineHeight: '1.3', flex: 1 }}>Deep dive to find highly obscure profiles.</p>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsSettingsOpen(false)} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600, borderRadius: '8px' }}>Save & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
