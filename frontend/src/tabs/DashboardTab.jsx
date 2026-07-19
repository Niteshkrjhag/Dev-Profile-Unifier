import { useState, useEffect } from 'react';

export default function DashboardTab() {
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('effiflo_formData');
    return saved ? JSON.parse(saved) : {
      name: '', github: '', stackoverflow: '', devto: '', hackernews: '',
      location: '', workplace: '', gender: '', profession_status: '',
      mode: 'transparent', depth: 'normal'
    };
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    const saved = sessionStorage.getItem('effiflo_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [countdown, setCountdown] = useState(null);
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
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Advanced Profile Discovery</h1>
          <p>Enter a developer's information and metadata to accurately resolve their identity.</p>
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '8px' }}>ENGINE MODES</p>

              <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="mode" value="transparent" disabled={formData.depth === 'lighter'} checked={formData.mode === 'transparent'} onChange={(e) => setFormData({ ...formData, mode: e.target.value })} />
                  Transparent (Manual Review)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="mode" value="autonomous" checked={formData.mode === 'autonomous'} onChange={(e) => setFormData({ ...formData, mode: e.target.value })} />
                  Autonomous (AI Auto-Merge)
                </label>
              </div>

              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '8px', marginTop: '16px' }}>CRAWL DEPTH</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="depth" value="lighter" checked={formData.depth === 'lighter'} onChange={(e) => {
                    // Force autonomous mode when lighter search is selected
                    setFormData({ ...formData, depth: e.target.value, mode: 'autonomous' })
                  }} />
                  Lighter (1 Iter)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="depth" value="normal" checked={formData.depth === 'normal'} onChange={(e) => setFormData({ ...formData, depth: e.target.value })} />
                  Normal (3 Iter)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="depth" value="deeper" checked={formData.depth === 'deeper'} onChange={(e) => setFormData({ ...formData, depth: e.target.value })} />
                  Deeper (5 Iter)
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Full Name (Mandatory)</label>
              <input
                required
                placeholder="e.g. Karan Maheswari"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={{ height: '1px', background: 'rgba(0,0,0,0.1)', margin: '8px 0' }}></div>
            <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>OPTIONAL METADATA</p>

            <input placeholder="Location (e.g. San Francisco)" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            <input placeholder="Workplace / Company" value={formData.workplace} onChange={(e) => setFormData({ ...formData, workplace: e.target.value })} />

            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)', width: '100%' }}>
              <option value="">Select Gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="status" value="student" checked={formData.profession_status === 'student'} onChange={(e) => setFormData({ ...formData, profession_status: e.target.value })} />
                Student
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="radio" name="status" value="professional" checked={formData.profession_status === 'professional'} onChange={(e) => setFormData({ ...formData, profession_status: e.target.value })} />
                Working Professional
              </label>
            </div>

            <div style={{ height: '1px', background: 'rgba(0,0,0,0.1)', margin: '8px 0' }}></div>
            <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>OPTIONAL EXACT HANDLES</p>

            <input placeholder="GitHub Handle" value={formData.github} onChange={(e) => setFormData({ ...formData, github: e.target.value })} />
            <input placeholder="StackOverflow Handle or ID" value={formData.stackoverflow} onChange={(e) => setFormData({ ...formData, stackoverflow: e.target.value })} />
            <input placeholder="Dev.to Username" value={formData.devto} onChange={(e) => setFormData({ ...formData, devto: e.target.value })} />
            <input placeholder="HackerNews Handle" value={formData.hackernews} onChange={(e) => setFormData({ ...formData, hackernews: e.target.value })} />

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

          {result?.type === 'disambiguation' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', border: '1px solid #FFCC00', display: 'flex', flexDirection: 'column', maxHeight: '850px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>⚠️ Multiple Choices Detected</h2>
                <button
                  onClick={() => setResult(null)}
                  style={{ background: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel / Clear
                </button>
              </div>
              <p style={{ marginBottom: '16px', marginTop: '8px' }}>
                {result.data.message || 'Multiple profiles match this identity. Please select the correct one or review pending links in the Admin Tab.'}
              </p>

              {result.data.candidates.filter(c => c.match_score > 0).length === 1 && countdown !== null && (
                <div style={{ background: 'rgba(40,199,111,0.1)', border: '1px solid var(--success-color)', padding: '8px 12px', borderRadius: '6px', marginBottom: '16px', color: 'var(--success-color)', fontWeight: 600 }}>
                  Exact Match found! Auto-selecting in {countdown} seconds...
                </div>
              )}
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
                          {c.confidence !== undefined && <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>(Confidence: {c.confidence})</span>}
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

      {/* Premium Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsSettingsOpen(false)}>
          <div style={{ background: 'var(--panel-bg)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', width: '90%', maxWidth: '600px', animation: 'fadeInUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>⚙️ Engine Configuration</h2>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px' }}>Operational Mode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div 
                  onClick={() => { if(formData.depth !== 'lighter') setFormData({...formData, mode: 'transparent'}) }}
                  style={{ padding: '20px', borderRadius: '12px', border: formData.mode === 'transparent' ? '2px solid var(--success-color)' : '1px solid rgba(255,255,255,0.1)', background: formData.mode === 'transparent' ? 'rgba(40,199,111,0.05)' : 'rgba(255,255,255,0.02)', cursor: formData.depth === 'lighter' ? 'not-allowed' : 'pointer', opacity: formData.depth === 'lighter' ? 0.5 : 1, transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '16px' }}
                >
                  <input type="radio" checked={formData.mode === 'transparent'} readOnly style={{ accentColor: 'var(--success-color)', marginTop: '4px' }} />
                  <div>
                    <strong style={{ color: formData.mode === 'transparent' ? 'var(--success-color)' : 'var(--text-primary)', display: 'block', fontSize: '1.1rem', marginBottom: '6px' }}>Transparent (Human-in-the-Loop)</strong>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                      Phase 1 exact matches and Phase 3 LLM fallbacks will pause the engine and require your manual verification. Recommended for precise auditing.
                    </p>
                  </div>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, mode: 'autonomous'})}
                  style={{ padding: '20px', borderRadius: '12px', border: formData.mode === 'autonomous' ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)', background: formData.mode === 'autonomous' ? 'rgba(115,103,240,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '16px' }}
                >
                  <input type="radio" checked={formData.mode === 'autonomous'} readOnly style={{ accentColor: 'var(--accent-color)', marginTop: '4px' }} />
                  <div>
                    <strong style={{ color: formData.mode === 'autonomous' ? 'var(--accent-color)' : 'var(--text-primary)', display: 'block', fontSize: '1.1rem', marginBottom: '6px' }}>Autonomous (AI Auto-Merge)</strong>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                      The engine will automatically merge the highest scoring candidates and seamlessly proceed without human intervention. Highly efficient.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px' }}>Crawl Depth Limit</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div 
                  onClick={() => setFormData({...formData, depth: 'lighter', mode: 'autonomous'})}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', border: formData.depth === 'lighter' ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.1)', background: formData.depth === 'lighter' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                >
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Lighter</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '12px' }}>1 Iteration</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4', flex: 1 }}>Fastest search. Forces Autonomous Mode.</p>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, depth: 'normal'})}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', border: formData.depth === 'normal' ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.1)', background: formData.depth === 'normal' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                >
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Normal</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '12px' }}>3 Iterations</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4', flex: 1 }}>Standard depth. Balances speed with thoroughness.</p>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, depth: 'deeper'})}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', border: formData.depth === 'deeper' ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.1)', background: formData.depth === 'deeper' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                >
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Deeper</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '12px' }}>5 Iterations</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4', flex: 1 }}>Deep dive to find highly obscure profiles.</p>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsSettingsOpen(false)} className="btn-primary" style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 600, borderRadius: '8px' }}>Save & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
