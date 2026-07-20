import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Search, ShieldAlert, Activity, FileText } from 'lucide-react';
import DashboardTab from './tabs/DashboardTab';
import AdminTab from './tabs/AdminTab';
import MonitoringTab from './tabs/MonitoringTab';
import DocsTab from './tabs/DocsTab';
import TestingTab from './tabs/TestingTab';
import { Bug } from 'lucide-react';

function Sidebar() {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Search', icon: Search },
    { path: '/admin', label: 'Admin Audit', icon: ShieldAlert },
    { path: '/testing', label: 'Testing', icon: Bug },
    { path: '/monitoring', label: 'Health', icon: Activity },
    { path: '/docs', label: 'Docs', icon: FileText },
  ];

  return (
    <nav className="sidebar glass-panel">
      <div style={{ padding: '0 16px 24px', fontWeight: 700, fontSize: '1.2rem' }}>
        Effiflo<span style={{ color: 'var(--accent-color)' }}>.</span>
      </div>
      {links.map((link) => (
        <NavLink 
          key={link.path} 
          to={link.path}
          className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
        >
          <link.icon size={20} />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Layout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content glass-panel">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardTab />} />
          <Route path="/admin" element={<AdminTab />} />
          <Route path="/testing" element={<TestingTab />} />
          <Route path="/monitoring" element={<MonitoringTab />} />
          <Route path="/docs" element={<DocsTab />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
