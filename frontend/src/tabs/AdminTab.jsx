import { useState, useEffect } from 'react';

export default function AdminTab() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLinks = async () => {
    try {
      const res = await fetch('http://localhost:8080/admin/links');
      const data = await res.json();
      setLinks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleUpdate = async (canonicalId, rawId, status) => {
    try {
      const res = await fetch(`http://localhost:8080/admin/links/${canonicalId}/${rawId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        // Refresh list
        fetchLinks();
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  if (loading) return <div>Loading admin audits...</div>;
  if (error) return <div style={{ color: 'var(--danger-color)' }}>Error: {error}</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>Admin Audit Console</h1>
        <p>Review flagged entity resolutions (pending review) and explicitly rejected links.</p>
      </div>

      {links.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          All clear! No pending audits.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {links.map((link) => (
            <div key={`${link.canonical_id}-${link.raw_profile_id}`} className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: link.status === 'rejected' ? 'var(--danger-color)' : '#FF9500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {link.status.replace('_', ' ')}
                  </div>
                  <h3 style={{ marginTop: '8px' }}>Target Entity: {link.canonical_entities.primary_name}</h3>
                  <p><strong>Platform:</strong> {link.raw_profiles.platform} &middot; <strong>Handle:</strong> {link.raw_profiles.handle}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-success" onClick={() => handleUpdate(link.canonical_id, link.raw_profile_id, 'confirmed')}>Approve</button>
                  {link.status !== 'rejected' && (
                    <button className="btn-danger" onClick={() => handleUpdate(link.canonical_id, link.raw_profile_id, 'rejected')}>Reject</button>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.03)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>LLM Reasoning (Confidence: {link.confidence_score})</h4>
                <p style={{ color: 'var(--text-primary)' }}>{link.match_reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
