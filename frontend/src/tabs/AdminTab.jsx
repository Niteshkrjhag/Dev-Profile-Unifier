import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminTab() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

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
        fetchLinks();
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
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
          {links.map((link) => {
            const rowId = `${link.canonical_id}-${link.raw_profile_id}`;
            const isExpanded = expandedRows.has(rowId);
            const isWarning = link.status !== 'rejected';
            
            return (
              <div key={rowId} className="glass-panel animate-fade-in" style={{ 
                padding: '24px', 
                borderLeft: `4px solid ${isWarning ? '#FFCC00' : 'var(--danger-color)'}` 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ 
                      fontSize: '0.85rem', fontWeight: 700, 
                      color: isWarning ? '#b38f00' : 'var(--danger-color)', 
                      textTransform: 'uppercase', letterSpacing: '1px',
                      background: isWarning ? 'rgba(255,204,0,0.2)' : 'rgba(255,59,48,0.1)',
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginBottom: '8px'
                    }}>
                      {link.status.replace('_', ' ')}
                    </div>
                    <h3 style={{ marginTop: '4px' }}>Target Entity: {link.canonical_entities.primary_name}</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <strong>Platform:</strong> {link.raw_profiles.platform} &middot; <strong>Handle:</strong> {link.raw_profiles.handle}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-success" onClick={() => handleUpdate(link.canonical_id, link.raw_profile_id, 'confirmed')}>Approve</button>
                    {isWarning && (
                      <button className="btn-danger" onClick={() => handleUpdate(link.canonical_id, link.raw_profile_id, 'rejected')}>Reject</button>
                    )}
                  </div>
                </div>
                
                <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <h4 style={{ marginBottom: '8px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>LLM Reasoning (Confidence: {link.confidence_score})</span>
                  </h4>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{link.match_reason}</p>
                </div>

                <div 
                  onClick={() => toggleRow(rowId)}
                  style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {isExpanded ? 'Hide Raw JSON Data' : 'View Raw JSON Data'}
                </div>

                {isExpanded && (
                  <div className="animate-fade-in" style={{ 
                    marginTop: '12px', 
                    background: '#1e1e1e', 
                    padding: '16px', 
                    borderRadius: '8px',
                    overflowX: 'auto'
                  }}>
                    <pre style={{ margin: 0, color: '#e6e6e6', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                      {JSON.stringify(link.raw_profiles.raw_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
