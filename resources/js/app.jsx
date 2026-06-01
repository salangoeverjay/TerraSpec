import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Icon, Logo, Btn, Inp } from './components.jsx';

function LoginModal({ onSuccess, onClose }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetch('/sanctum/csrf-cookie', { credentials: 'include' });

      const res = await fetch('/api/lgu/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(
            document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
          ),
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Invalid email or password.');
        setLoading(false);
        return;
      }

      onSuccess(data);
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
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
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5 }}>Email</label>
            <input ref={inputRef} className="input" style={{ width: '100%', boxSizing: 'border-box' }} type="email" placeholder="Enter email address" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/>
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
  const [screen, setScreen]           = useState(() => {
    try { return sessionStorage.getItem('terraspec-screen') || 'landing'; } catch { return 'landing'; }
  });
  const [screenProps, setScreenProps] = useState({});
  const [role, setRole]               = useState('public');
  const [lguUser, setLguUser]         = useState(null);
  const [dark, setDark]               = useState(false);
  const [showLogin, setShowLogin]     = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [search, setSearch]           = useState('');
  const [mapContext, setMapContext]    = useState(null); // { barangay, zone, score }

  function handleLoginSuccess(user) {
    setLguUser(user);
    setRole('admin');
    setShowLogin(false);
  }

  function handleLogout() {
    fetch('/api/lgu/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setLguUser(null);
    setRole('public');
    if (screen === 'admin') go('dashboard');
  }

  function go(s, props = {}) {
    setScreen(s);
    setScreenProps(props);
    try { sessionStorage.setItem('terraspec-screen', s); } catch {}
  }

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
    <div className={`app${showSidebar ? ' mobile-sidebar-open' : ''}`}>
      {showLogin && (
        <LoginModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      )}
      {/* Topbar */}
      <header className="topbar" style={{ gap: 0 }}>
        {/* Left section */}
        <div className="row" style={{ flex: 1, gap: 12, minWidth: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm btn-menu" onClick={() => setShowSidebar(s => !s)} style={{ marginRight: 8 }} aria-label="Toggle menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <button onClick={() => go('landing')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <Logo/>
          </button>
          <div className="sep-v" style={{ height: 24 }}/>
          <div className="row" style={{ gap: 6 }}>
            <Icon name="pin" size={13} style={{ color: 'hsl(var(--brand))' }}/>
            <span className="muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>Panabo City, Davao del Norte</span>
          </div>
        </div>

        {/* Center section – search (only on map screen) */}
        <div style={{ flex: '0 0 360px', maxWidth: '36%', display: 'flex', justifyContent: 'center' }}>
          {screen === 'map' && (
            <Inp icon="search" placeholder="Search parcels or barangays…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
          )}
        </div>

        {/* Right section */}
        <div className="row" style={{ flex: 1, justifyContent: 'flex-end', gap: 8 }}>
          <div className="tabs">
            <div className={`tab${role === 'public' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => role === 'admin' ? handleLogout() : null}>Public</div>
            <div className={`tab${role === 'admin' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => role === 'admin' ? null : setShowLogin(true)}>LGU Admin</div>
          </div>

          {role === 'admin' && lguUser && (
            <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{lguUser.name}</span>
          )}

          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDark(d => !d)} title={dark ? 'Light mode' : 'Dark mode'}>
            <Icon name={dark ? 'sun' : 'moon'} size={14}/>
          </button>

          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 600 }}>
            {lguUser ? lguUser.name.charAt(0).toUpperCase() : 'G'}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar" onClick={() => { /* keep clicks inside */ }}>
        {sections.map(sec => {
          const items = NAV.filter(n => n.section === sec && (!n.adminOnly || role === 'admin'));
          if (!items.length) return null;
          return (
            <div key={sec}>
              <div className="nav-section">{sectionLabels[sec]}</div>
              {items.map(n => (
                <div key={n.id} className={`nav-item${screen === n.id ? ' active' : ''}`} onClick={() => { go(n.id); setShowSidebar(false); }}>
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
              <Btn variant="brand" onClick={() => setShowLogin(true)}>Sign In as LGU Admin</Btn>
            </div>
          </div>
        ) : (
          <Screen go={go} role={role} search={search} setSearch={setSearch} mapContext={mapContext} setMapContext={setMapContext} {...screenProps}/>
        )}
      </main>
      {showSidebar && (
        <div className="mobile-overlay" onClick={() => setShowSidebar(false)} />
      )}
    </div>
  );
}

const container = document.getElementById('panabo-map');
if (container) createRoot(container).render(<App/>);
