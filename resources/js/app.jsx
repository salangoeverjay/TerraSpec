import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Icon, Logo, Btn } from './components.jsx';

function LoginModal({ onSuccess, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        onSuccess();
      } else {
        setError('Invalid username or password.');
        setLoading(false);
      }
    }, 500);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '32px 28px', width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={16} style={{ color: 'white' }}/>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>LGU Admin Login</div>
            <div className="muted" style={{ fontSize: 12 }}>Panabo City · TerraSpec DSS</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5 }}>Username</label>
            <input ref={inputRef} className="input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"/>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5 }}>Password</label>
            <input className="input" style={{ width: '100%', boxSizing: 'border-box' }} type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', background: 'hsl(var(--destructive) / 0.08)', border: '1px solid hsl(var(--destructive) / 0.2)', borderRadius: 6, padding: '8px 10px' }}>
              {error}
            </div>
          )}

          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <Btn type="button" variant="outline" style={{ flex: 1 }} onClick={onClose}>Cancel</Btn>
            <Btn type="submit" variant="brand" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
import { DashboardScreen } from './dashboard.jsx';
import { ChatScreen } from './chat.jsx';
import { MapScreen } from './panabo-map.jsx';
import { SuitabilityScreen } from './suitability.jsx';
import { EnvironmentalScreen } from './environmental.jsx';
import { ReforestationScreen } from './reforestation.jsx';
import { ReportsScreen } from './reports.jsx';
import { AdminScreen } from './admin.jsx';
import { LandingPage } from './landing.jsx';

const NAV = [
  { id: 'dashboard',     label: 'Dashboard',    icon: 'home',          section: 'main' },
  { id: 'map',           label: 'Map Viewer',   icon: 'map',           section: 'main' },
  { id: 'suitability',   label: 'Suitability',  icon: 'sliders',       section: 'analysis' },
  { id: 'environmental', label: 'Environmental', icon: 'shield',        section: 'analysis' },
  { id: 'reforestation', label: 'Reforestation', icon: 'leaf',         section: 'analysis' },
  { id: 'chat',          label: 'AI Assistant', icon: 'messageSquare', section: 'tools' },
  { id: 'reports',       label: 'Reports',      icon: 'file',          section: 'tools' },
  { id: 'admin',         label: 'Admin',        icon: 'settings',      section: 'admin', adminOnly: true },
];

function App() {
  const [screen, setScreen]           = useState('landing');
  const [screenProps, setScreenProps] = useState({});
  const [role, setRole]               = useState('public');
  const [dark, setDark]               = useState(false);
  const [showLogin, setShowLogin]     = useState(false);

  function go(s, props = {}) { setScreen(s); setScreenProps(props); }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const sections = [...new Set(NAV.map(n => n.section))];
  const sectionLabels = { main: 'Navigation', analysis: 'Analysis', tools: 'Tools', admin: 'Admin' };

  const screens = {
    dashboard:     DashboardScreen,
    map:           MapScreen,
    suitability:   SuitabilityScreen,
    environmental: EnvironmentalScreen,
    reforestation: ReforestationScreen,
    chat:          ChatScreen,
    reports:       ReportsScreen,
    admin:         AdminScreen,
  };
  const Screen = screens[screen] || DashboardScreen;

  const isFullscreen = screen === 'map' || screen === 'chat';

  if (screen === 'landing') {
    return <LandingPage go={go}/>;
  }

  return (
    <div className="app">
      {showLogin && (
        <LoginModal
          onSuccess={() => { setRole('admin'); setShowLogin(false); }}
          onClose={() => setShowLogin(false)}
        />
      )}
      {/* Topbar */}
      <header className="topbar">
        <Logo/>
        <div className="sep-v" style={{ height: 24, margin: '0 4px' }}/>
        <div className="row" style={{ gap: 6 }}>
          <Icon name="pin" size={13} style={{ color: 'hsl(var(--brand))' }}/>
          <span className="muted" style={{ fontSize: 12.5 }}>Panabo City, Davao del Norte</span>
        </div>

        <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
          <div className="tabs">
            <div className={`tab${role === 'public' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setRole('public')}>Public</div>
            <div className={`tab${role === 'admin' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => role === 'admin' ? setRole('public') : setShowLogin(true)}>LGU Admin</div>
          </div>

          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDark(d => !d)} title={dark ? 'Light mode' : 'Dark mode'}>
            <Icon name={dark ? 'sun' : 'moon'} size={14}/>
          </button>

          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 600 }}>
            {role === 'admin' ? 'A' : 'G'}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar">
        {sections.map(sec => {
          const items = NAV.filter(n => n.section === sec && (!n.adminOnly || role === 'admin'));
          if (!items.length) return null;
          return (
            <div key={sec}>
              <div className="nav-section">{sectionLabels[sec]}</div>
              {items.map(n => (
                <div key={n.id} className={`nav-item${screen === n.id ? ' active' : ''}`} onClick={() => go(n.id)}>
                  <Icon name={n.icon} size={15}/>
                  <span>{n.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Content */}
      <main className="content" style={isFullscreen ? { overflow: 'hidden', padding: 0 } : {}}>
        {screen === 'admin' && role !== 'admin' ? (
          <div className="page">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center' }}>
              <Icon name="lock" size={48} style={{ color: 'hsl(var(--muted-foreground))' }}/>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Admin Access Required</h2>
              <p className="muted">Switch to LGU Admin role to access this section.</p>
              <Btn variant="brand" onClick={() => setRole('admin')}>Switch to Admin</Btn>
            </div>
          </div>
        ) : (
          <Screen go={go} role={role} {...screenProps}/>
        )}
      </main>
    </div>
  );
}

const container = document.getElementById('panabo-map');
if (container) createRoot(container).render(<App/>);
