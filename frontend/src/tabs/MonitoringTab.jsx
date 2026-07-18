import { useState, useEffect } from 'react';

export default function MonitoringTab() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('http://localhost:8080/health');
        const data = await res.json();
        setMetrics(data.metrics);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading telemetry...</div>;
  if (!metrics) return <div>Backend offline</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>System Telemetry</h1>
        <p>Live health metrics and observability from the API backend.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* API Calls Widget */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '16px' }}>API Fetches</h3>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span>GitHub</span> <strong>{metrics.total_api_calls.github}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span>StackOverflow</span> <strong>{metrics.total_api_calls.stackoverflow}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span>Dev.to</span> <strong>{metrics.total_api_calls.devto}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>HackerNews</span> <strong>{metrics.total_api_calls.hackernews}</strong>
            </li>
          </ul>
        </div>

        {/* LLM Usage Widget */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '16px' }}>Gemini Inference (2.5 Flash)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '300', color: 'var(--text-primary)' }}>{metrics.llm.total_tokens_used.toLocaleString()}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Tokens Burned</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '400', color: 'var(--success-color)' }}>${metrics.llm.estimated_cost_usd.toFixed(5)}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estimated Cost</div>
            </div>
          </div>
        </div>

        {/* Performance Widget */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '16px' }}>Resolution Latency</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: '300', color: 'var(--accent-color)' }}>{Math.round(metrics.resolutions.average_time_ms)}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>ms</span></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg End-to-End Resolution</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '400' }}>{metrics.resolutions.count}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Resolutions</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
