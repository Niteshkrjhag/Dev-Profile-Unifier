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

  // Group links by Target Entity (Canonical Name)
  const groupedLinks = links.reduce((acc, link) => {
    const entityName = link.canonical_entities?.primary_name || "Unknown Entity";
    if (!acc[entityName]) {
      acc[entityName] = { pending_review: [], rejected: [] };
    }
    if (link.status === 'pending_review') {
      acc[entityName].pending_review.push(link);
    } else if (link.status === 'rejected') {
      acc[entityName].rejected.push(link);
    }
    return acc;
  }, {});

  if (loading) return <div>Loading admin audits...</div>;
  if (error) return <div style={{ color: 'var(--danger-color)' }}>Error: {error}</div>;

  const LinkCard = ({ link, type }) => {
    const rowId = `${link.canonical_id}-${link.raw_profile_id}`;
    const isExpanded = expandedRows.has(rowId);
    const isPending = type === 'pending';

    return (
      <div style={{ 
        padding: '16px', 
        background: isPending ? 'rgba(255,204,0,0.05)' : 'rgba(255,59,48,0.05)',
        border: `1px solid ${isPending ? 'rgba(255,204,0,0.2)' : 'rgba(255,59,48,0.2)'}`,
        borderRadius: '8px',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
              <strong style={{ textTransform: 'capitalize' }}>{link.raw_profiles.platform}</strong> &middot; {link.raw_profiles.handle}
            </p>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>LLM Confidence:</strong> {link.confidence_score}
            </div>
            <p style={{ fontSize: '0.9rem', marginTop: '8px', lineHeight: '1.4' }}>{link.match_reason}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <button className="btn-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleUpdate(link.canonical_id, link.raw_profile_id, 'confirmed')}>Approve</button>
            {isPending && (
              <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleUpdate(link.canonical_id, link.raw_profile_id, 'rejected')}>Reject</button>
            )}
          </div>
        </div>

        <div 
          onClick={() => toggleRow(rowId)}
          style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? 'Hide Raw Profile JSON' : 'View Raw Profile JSON'}
        </div>

        {isExpanded && (
          <div className="animate-fade-in" style={{ 
            marginTop: '12px', 
            background: '#1a1a1a', 
            padding: '12px', 
            borderRadius: '6px',
            overflowX: 'auto'
          }}>
            <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              {JSON.stringify(link.raw_profiles.raw_data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>Admin Audit Console</h1>
        <p>Review flagged entity resolutions (pending review) and explicitly rejected links, grouped by your search queries.</p>
      </div>

      {Object.keys(groupedLinks).length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          All clear! No pending audits.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {Object.entries(groupedLinks).map(([entityName, groups]) => {
            const hasPending = groups.pending_review.length > 0;
            const hasRejected = groups.rejected.length > 0;
            
            return (
              <div key={entityName} className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                <h2 style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--accent-color)' }}>
                  Search Target: {entityName}
                </h2>
                
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Pending Review Column */}
                  {hasPending && (
                    <div style={{ flex: '1 1 300px' }}>
                      <h3 style={{ fontSize: '1rem', color: '#b38f00', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#FFCC00' }}></span>
                        Pending Review ({groups.pending_review.length})
                      </h3>
                      {groups.pending_review.map(link => (
                        <LinkCard key={`${link.canonical_id}-${link.raw_profile_id}`} link={link} type="pending" />
                      ))}
                    </div>
                  )}

                  {/* Rejected Column */}
                  {hasRejected && (
                    <div style={{ flex: '1 1 300px' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--danger-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger-color)' }}></span>
                        Rejected ({groups.rejected.length})
                      </h3>
                      {groups.rejected.map(link => (
                        <LinkCard key={`${link.canonical_id}-${link.raw_profile_id}`} link={link} type="rejected" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
