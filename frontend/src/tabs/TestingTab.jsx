import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, FileJson, Bug, ChevronDown, ChevronUp } from 'lucide-react';

const CollapsibleSection = ({ title, description, data, searchTerm }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (!data || Object.keys(data).length === 0) return null;

  const jsonString = JSON.stringify(data, null, 2);
  const isMatch = searchTerm && jsonString.toLowerCase().includes(searchTerm.toLowerCase());
  
  return (
    <div className="card glass-panel" style={{ marginBottom: '24px' }}>
      <div 
        className="card-header" 
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
            <FileJson size={20} />
            {title}
            {isMatch && <span style={{ fontSize: '0.8rem', background: 'var(--accent-color)', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Search Match</span>}
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>{description}</p>
        </div>
        {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </div>
      
      {isOpen && (
        <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <pre style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
};

export default function TestingTab() {
  const [debugData, setDebugData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Poll session storage just in case they switch tabs immediately after a search
    const data = sessionStorage.getItem('effiflo_debug_data');
    if (data) {
      try {
        setDebugData(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse debug data", e);
      }
    }
  }, []);

  return (
    <div className="tab-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 8px 0' }}>
            <Bug size={32} color="var(--accent-color)" />
            Testing & Debugging
          </h1>
          <p className="text-secondary" style={{ margin: 0 }}>
            Inspect the raw JSON payloads and intermediate data structures returned by the search engine during your most recent resolution.
          </p>
        </div>
      </div>

      {!debugData ? (
        <div className="card glass-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Bug size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
          <h3>No Debug Data Available</h3>
          <p className="text-secondary">
            Run a search in the Dashboard tab first. The system resets this debug view on every new search.
          </p>
        </div>
      ) : (
        <>
          <div className="search-box" style={{ marginBottom: '24px' }}>
            <SearchIcon size={20} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Full-text search inside JSON payloads (e.g., 'python', 'San Francisco', 'octocat')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <CollapsibleSection 
            title="Phase 1: Direct Name Search (Raw Data)" 
            description="The unfiltered lists of profiles returned directly by the platforms' search APIs when you provided a name without an explicit handle. This is prior to any heuristic filtering."
            data={debugData.phase_1_raw} 
            searchTerm={searchTerm} 
          />

          <CollapsibleSection 
            title="Phase 3: Fallback Crawl Search (Raw Data)" 
            description="The massive list of profiles returned when the engine could not find explicitly linked handles during the graph crawl. Shows all candidates returned by the APIs."
            data={debugData.phase_3_raw} 
            searchTerm={searchTerm} 
          />

          <CollapsibleSection 
            title="Phase 3: Filtered LLM Input (Top 5 Ranked)" 
            description="The final sliced array of candidates that survived the N-Gram heuristic filter. This exact JSON payload is what was batched and sent to Gemini for final tiebreaking."
            data={debugData.phase_3_llm_input} 
            searchTerm={searchTerm} 
          />
        </>
      )}
    </div>
  );
}
