import React from 'react';

export function Icon({ name, size = 16, style, className = '' }) {
  const s = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const map = {
    search:       <><circle cx="11" cy="11" r="8" {...s}/><path d="m21 21-4.35-4.35" {...s}/></>,
    pin:          <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...s}/><circle cx="12" cy="10" r="3" {...s}/></>,
    alert:        <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...s}/><line x1="12" y1="9" x2="12" y2="13" {...s}/><line x1="12" y1="17" x2="12.01" y2="17" {...s}/></>,
    globe:        <><circle cx="12" cy="12" r="10" {...s}/><line x1="2" y1="12" x2="22" y2="12" {...s}/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s}/></>,
    leaf:         <><path d="M17 8C8 10 5.9 16.17 3.82 19.5c-1.06 1.5-2.82 1.17-2.82 1.17" {...s}/><path d="M3.82 19.5C5 17 8.6 10.36 17 8" {...s}/></>,
    layers:       <><polygon points="12 2 2 7 12 12 22 7 12 2" {...s}/><polyline points="2 17 12 22 22 17" {...s}/><polyline points="2 12 12 17 22 12" {...s}/></>,
    plus:         <><line x1="12" y1="5" x2="12" y2="19" {...s}/><line x1="5" y1="12" x2="19" y2="12" {...s}/></>,
    x:            <><line x1="18" y1="6" x2="6" y2="18" {...s}/><line x1="6" y1="6" x2="18" y2="18" {...s}/></>,
    file:         <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s}/><polyline points="14 2 14 8 20 8" {...s}/><line x1="16" y1="13" x2="8" y2="13" {...s}/><line x1="16" y1="17" x2="8" y2="17" {...s}/></>,
    more:         <><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/></>,
    scale:        <><line x1="12" y1="20" x2="12" y2="4" {...s}/><path d="M20 21H4" {...s}/><path d="M6.5 7.5L12 4l5.5 3.5-2.75 5H9.25z" {...s}/></>,
    info:         <><circle cx="12" cy="12" r="10" {...s}/><line x1="12" y1="8" x2="12" y2="12" {...s}/><line x1="12" y1="16" x2="12.01" y2="16" {...s}/></>,
    chart:        <><line x1="18" y1="20" x2="18" y2="10" {...s}/><line x1="12" y1="20" x2="12" y2="4" {...s}/><line x1="6" y1="20" x2="6" y2="14" {...s}/></>,
    users:        <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s}/><circle cx="9" cy="7" r="4" {...s}/><path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s}/><path d="M16 3.13a4 4 0 0 1 0 7.75" {...s}/></>,
    map:          <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" {...s}/><line x1="8" y1="2" x2="8" y2="18" {...s}/><line x1="16" y1="6" x2="16" y2="22" {...s}/></>,
    settings:     <><circle cx="12" cy="12" r="3" {...s}/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...s}/></>,
    moon:         <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...s}/>,
    sun:          <><circle cx="12" cy="12" r="5" {...s}/><line x1="12" y1="1" x2="12" y2="3" {...s}/><line x1="12" y1="21" x2="12" y2="23" {...s}/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" {...s}/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" {...s}/><line x1="1" y1="12" x2="3" y2="12" {...s}/><line x1="21" y1="12" x2="23" y2="12" {...s}/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" {...s}/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" {...s}/></>,
    chevronDown:  <polyline points="6 9 12 15 18 9" {...s}/>,
    chevronRight: <polyline points="9 18 15 12 9 6" {...s}/>,
    chevronLeft:  <polyline points="15 18 9 12 15 6" {...s}/>,
    send:         <><line x1="22" y1="2" x2="11" y2="13" {...s}/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" fill="currentColor"/></>,
    bot:          <><rect x="3" y="11" width="18" height="10" rx="2" {...s}/><circle cx="12" cy="5" r="2" {...s}/><path d="M12 7v4" {...s}/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/></>,
    trash:        <><polyline points="3 6 5 6 21 6" {...s}/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...s}/></>,
    sliders:      <><line x1="4" y1="21" x2="4" y2="14" {...s}/><line x1="4" y1="10" x2="4" y2="3" {...s}/><line x1="12" y1="21" x2="12" y2="12" {...s}/><line x1="12" y1="8" x2="12" y2="3" {...s}/><line x1="20" y1="21" x2="20" y2="16" {...s}/><line x1="20" y1="12" x2="20" y2="3" {...s}/><line x1="1" y1="14" x2="7" y2="14" {...s}/><line x1="9" y1="8" x2="15" y2="8" {...s}/><line x1="17" y1="16" x2="23" y2="16" {...s}/></>,
    check:        <polyline points="20 6 9 17 4 12" {...s}/>,
    filter:       <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" {...s}/>,
    download:     <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...s}/><polyline points="7 10 12 15 17 10" {...s}/><line x1="12" y1="15" x2="12" y2="3" {...s}/></>,
    eye:          <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...s}/><circle cx="12" cy="12" r="3" {...s}/></>,
    edit:         <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...s}/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...s}/></>,
    lock:         <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...s}/><path d="M7 11V7a5 5 0 0 1 10 0v4" {...s}/></>,
    home:         <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...s}/><polyline points="9 22 9 12 15 12 15 22" {...s}/></>,
    messageSquare:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...s}/>,
    shield:       <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s}/>,
    list:         <><line x1="8" y1="6" x2="21" y2="6" {...s}/><line x1="8" y1="12" x2="21" y2="12" {...s}/><line x1="8" y1="18" x2="21" y2="18" {...s}/><line x1="3" y1="6" x2="3.01" y2="6" {...s}/><line x1="3" y1="12" x2="3.01" y2="12" {...s}/><line x1="3" y1="18" x2="3.01" y2="18" {...s}/></>,
    zap:          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="2" fill="currentColor"/>,
    tree:         <><path d="M12 22v-7" {...s}/><path d="M6 15h12M8 10h8M10 5h4" {...s}/><path d="M12 15L9 10l-3 5h12l-3-5-3 5" {...s}/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} className={className} aria-hidden="true">
      {map[name] || <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>}
    </svg>
  );
}

export function Btn({ children, variant = 'secondary', sz, icon, onClick, disabled, style, type = 'button' }) {
  const cls = ['btn', `btn-${variant}`, sz && `btn-${sz}`, icon && !children ? 'btn-icon' : ''].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} style={style}>
      {icon && <Icon name={icon} size={13}/>}
      {children}
    </button>
  );
}

export function Card({ children, style, className = '' }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export function CardHeader({ children, style }) {
  return <div className="card-header" style={style}>{children}</div>;
}

export function CardBody({ children, style }) {
  return <div className="card-body" style={style}>{children}</div>;
}

export function Badge({ children, variant = '', style }) {
  return <span className={`badge${variant ? ` badge-${variant}` : ''}`} style={style}>{children}</span>;
}

export function Inp({ value, onChange, placeholder, icon, type = 'text', style, onKeyDown }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {icon && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))', pointerEvents: 'none' }}><Icon name={icon} size={14}/></span>}
      <input type={type} className="input" value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} style={icon ? { paddingLeft: 34 } : {}}/>
    </div>
  );
}

export function ScoreRing({ value = 0, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value >= 75 ? 'hsl(162 55% 42%)' : value >= 50 ? 'hsl(35 90% 50%)' : 'hsl(0 70% 55%)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={Math.round(size/4.5)} fontWeight={700} fill={color}>{value}</text>
    </svg>
  );
}

export function Logo() {
  return (
    <div className="row" style={{ gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg viewBox="0 0 20 20" fill="white" width={14} height={14}><path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z"/></svg>
      </div>
      <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>TERRASPEC</span>
    </div>
  );
}

export function PanaboMapSVG({ style }) {
  return (
    <svg viewBox="0 0 400 260" style={{ width: '100%', height: '100%', display: 'block', ...style }} aria-hidden="true">
      <rect width={400} height={260} fill="hsl(var(--muted) / 0.4)"/>
      <ellipse cx={55} cy={220} rx={70} ry={35} fill="#0ea5e9" opacity={0.2}/>
      <rect x={75} y={50}  width={95}  height={75}  rx={3} fill="#f97316" opacity={0.35}/>
      <rect x={178} y={40} width={85}  height={65}  rx={3} fill="#3b82f6" opacity={0.35}/>
      <rect x={270} y={70} width={110} height={85}  rx={3} fill="#8b5cf6" opacity={0.3}/>
      <rect x={90}  y={140} width={130} height={80} rx={3} fill="#84cc16" opacity={0.35}/>
      <rect x={228} y={160} width={100} height={70} rx={3} fill="#10b981" opacity={0.35}/>
      <rect x={30}  y={115} width={50}  height={50} rx={3} fill="#06b6d4" opacity={0.35}/>
      <line x1={0} y1={120} x2={400} y2={120} stroke="hsl(var(--border))" strokeWidth={1.5}/>
      <line x1={185} y1={0} x2={185} y2={260} stroke="hsl(var(--border))" strokeWidth={1}/>
      <circle cx={122} cy={87}  r={5} fill="white" opacity={0.9}/>
      <circle cx={220} cy={72}  r={5} fill="white" opacity={0.9}/>
      <circle cx={155} cy={180} r={5} fill="white" opacity={0.9}/>
      <circle cx={280} cy={112} r={5} fill="white" opacity={0.9}/>
      <text x={385} y={18} fontSize={10} fill="hsl(var(--muted-foreground))" textAnchor="middle">N</text>
      <path d="M385 22 L382 34 L385 31 L388 34Z" fill="hsl(var(--muted-foreground))"/>
    </svg>
  );
}
