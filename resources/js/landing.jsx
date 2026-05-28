import React from 'react';
import { Map, MapMarker, MarkerContent, MarkerTooltip } from '../../components/ui/map';
import { PANABO } from './data.js';

export function LandingPage({ go }) {
  return (
    <>
      <style>{`
        .lp-root { background: #fbfaf7; color: hsl(240 10% 8%); font-family: 'Geist', sans-serif; }
        .lp-shell { max-width: 1240px; margin: 0 auto; padding: 0 32px; }

        .lp-nav {
          position: sticky; top: 0; z-index: 50;
          backdrop-filter: blur(12px);
          background: rgba(251,250,247,0.78);
          border-bottom: 1px solid hsl(240 6% 92%);
        }
        .lp-nav-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .lp-brand { display: flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: -0.01em; text-decoration: none; color: inherit; }
        .lp-mark {
          width: 26px; height: 26px; border-radius: 7px;
          background: hsl(162 47% 39%);
          display: grid; place-items: center;
          color: #fff; font-family: 'Geist Mono', monospace; font-size: 13px;
          box-shadow: 0 1px 0 rgba(0,0,0,.04), inset 0 -2px 0 rgba(0,0,0,.08);
          flex-shrink: 0;
        }
        .lp-nav-links { display: flex; gap: 28px; }
        .lp-nav-links a { color: hsl(240 6% 30%); font-size: 13.5px; font-weight: 500; text-decoration: none; cursor: pointer; }
        .lp-nav-links a:hover { color: hsl(162 47% 32%); }

        .lp-hero { padding: 72px 0 56px; }
        .lp-hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; margin-top: 24px; }

        .lp-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-family: 'Geist Mono', monospace; font-size: 11.5px;
          text-transform: uppercase; letter-spacing: 0.12em; color: hsl(162 47% 32%);
          padding: 6px 12px; border-radius: 999px;
          background: hsl(162 47% 39% / 0.08); border: 1px solid hsl(162 47% 39% / 0.18);
        }
        .lp-dotpulse {
          width: 6px; height: 6px; border-radius: 999px; background: hsl(162 47% 39%);
          animation: lpdotpulse 2s ease-out infinite;
        }
        @keyframes lpdotpulse {
          0% { box-shadow: 0 0 0 0 hsl(162 47% 39% / 0.55); }
          80%, 100% { box-shadow: 0 0 0 10px hsl(162 47% 39% / 0); }
        }
        .lp-h1 {
          font-family: 'Fraunces', serif; font-weight: 400;
          font-size: clamp(48px, 6vw, 86px); line-height: 0.96; letter-spacing: -0.035em;
          margin: 18px 0 22px; color: hsl(240 10% 6%);
        }
        .lp-h1 em { font-style: italic; font-weight: 300; color: hsl(162 47% 32%); }
        .lp-h1-mono {
          font-family: 'Geist Mono', monospace; font-size: 0.42em;
          vertical-align: super; font-weight: 500; letter-spacing: 0;
          color: hsl(240 6% 50%); margin-left: 6px;
        }
        .lp-sub { font-size: 17px; line-height: 1.55; color: hsl(240 6% 32%); max-width: 520px; }
        .lp-cta-row { display: flex; gap: 12px; margin-top: 28px; align-items: center; }

        .lp-btn {
          display: inline-flex; align-items: center; gap: 8px;
          height: 48px; padding: 0 22px; border-radius: 10px;
          font-weight: 500; font-size: 14.5px; letter-spacing: -0.005em;
          transition: all .15s ease; text-decoration: none; cursor: pointer; border: none;
        }
        .lp-btn-primary { background: hsl(240 10% 8%); color: #fff; border: 1px solid hsl(240 10% 8%); }
        .lp-btn-primary:hover { background: hsl(162 47% 32%); border-color: hsl(162 47% 32%); }
        .lp-btn-ghost { background: transparent; color: hsl(240 10% 8%); border: 1px solid hsl(240 6% 80%); }
        .lp-btn-ghost:hover { background: hsl(240 4% 95%); }
        .lp-btn .lp-arrow { transition: transform .2s; }
        .lp-btn:hover .lp-arrow { transform: translateX(3px); }

        .lp-hero-meta {
          margin-top: 56px; display: grid; grid-template-columns: repeat(4,1fr);
          border-top: 1px solid hsl(240 6% 88%); border-bottom: 1px solid hsl(240 6% 88%);
        }
        .lp-hero-meta > div { padding: 20px 24px 20px 0; border-right: 1px solid hsl(240 6% 88%); }
        .lp-hero-meta > div:last-child { border-right: none; padding-right: 0; }
        .lp-meta-key { font-family: 'Geist Mono', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.12em; color: hsl(240 6% 45%); margin-bottom: 8px; }
        .lp-meta-val { font-size: 14px; font-weight: 500; color: hsl(240 10% 12%); line-height: 1.35; }

        .lp-map-card {
          position: relative; border-radius: 18px;
          background: linear-gradient(160deg, #f4f1ea 0%, #ebe6dc 100%);
          border: 1px solid hsl(240 6% 88%); padding: 22px;
          box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 30px 60px -30px rgba(20,40,30,0.18);
          overflow: hidden; aspect-ratio: 1.02 / 1;
        }
        .lp-map-svg { width: 100%; height: 100%; display: block; }
        .lp-map-corner {
          position: absolute; bottom: 14px; left: 14px; right: 14px;
          display: flex; align-items: center; justify-content: space-between;
          font-family: 'Geist Mono', monospace; font-size: 10.5px;
          color: hsl(240 6% 35%); text-transform: uppercase; letter-spacing: 0.1em;
        }
        .lp-map-pill {
          position: absolute;
          background: rgba(255,255,255,0.92); border: 1px solid hsl(240 6% 86%);
          border-radius: 10px; padding: 10px 12px;
          box-shadow: 0 6px 16px -8px rgba(0,0,0,.15);
          font-size: 12px; backdrop-filter: blur(6px); max-width: 220px;
        }
        .lp-pill-label { font-family: 'Geist Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(240 6% 45%); margin-bottom: 4px; }
        .lp-pill-val { font-weight: 600; font-size: 13.5px; color: hsl(240 10% 10%); }
        .lp-map-pin { position: absolute; width: 14px; height: 14px; border-radius: 999px; background: hsl(162 47% 39%); box-shadow: 0 0 0 4px hsl(162 47% 39% / 0.2), 0 0 0 8px hsl(162 47% 39% / 0.08); }

        .lp-stats {
          display: grid; grid-template-columns: repeat(4,1fr);
          border-radius: 16px; background: hsl(240 10% 8%); color: #fff;
          padding: 36px 8px; margin-top: 8px;
          box-shadow: 0 30px 60px -30px rgba(20,40,30,.35);
        }
        .lp-stats > div { padding: 0 32px; border-right: 1px solid rgba(255,255,255,0.1); }
        .lp-stats > div:last-child { border-right: none; }
        .lp-stat-v { font-family: 'Fraunces', serif; font-weight: 300; font-size: 52px; letter-spacing: -0.03em; line-height: 1; color: #fff; margin-bottom: 8px; }
        .lp-stat-v em { color: hsl(162 55% 60%); font-style: italic; }
        .lp-stat-k { font-family: 'Geist Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: hsl(240 4% 65%); }
        .lp-stat-note { font-size: 12.5px; color: hsl(240 4% 75%); margin-top: 4px; line-height: 1.4; }

        .lp-section { padding: 88px 0; border-top: 1px solid hsl(240 6% 92%); }
        .lp-section-tag { font-family: 'Geist Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: hsl(162 47% 32%); margin-bottom: 14px; }
        .lp-section-h { font-family: 'Fraunces', serif; font-weight: 400; font-size: clamp(36px,4.6vw,56px); line-height: 1.02; letter-spacing: -0.025em; margin: 0; color: hsl(240 10% 8%); max-width: 800px; }
        .lp-section-h em { font-style: italic; color: hsl(162 47% 32%); font-weight: 300; }
        .lp-section-lead { font-size: 17px; line-height: 1.6; color: hsl(240 6% 32%); max-width: 620px; margin-top: 16px; }

        .lp-pillars { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; margin-top: 48px; }
        .lp-pillar {
          background: #fff; border: 1px solid hsl(240 6% 90%); border-radius: 16px; padding: 28px;
          position: relative; overflow: hidden;
          transition: transform .25s, border-color .25s, box-shadow .25s;
        }
        .lp-pillar:hover { transform: translateY(-2px); border-color: hsl(162 47% 39% / 0.4); box-shadow: 0 16px 32px -16px rgba(20,40,30,.12); }
        .lp-pillar-num { font-family: 'Geist Mono', monospace; font-size: 11px; color: hsl(240 6% 45%); letter-spacing: 0.1em; }
        .lp-pillar h3 { font-family: 'Fraunces', serif; font-weight: 400; font-size: 28px; line-height: 1.1; letter-spacing: -0.02em; margin: 14px 0 12px; color: hsl(240 10% 8%); }
        .lp-pillar p { font-size: 14.5px; line-height: 1.55; color: hsl(240 6% 35%); margin: 0; }
        .lp-pillar-stack { margin-top: 22px; display: flex; gap: 6px; flex-wrap: wrap; }
        .lp-tech { font-family: 'Geist Mono', monospace; font-size: 11px; padding: 3px 8px; border-radius: 6px; background: hsl(240 6% 96%); color: hsl(240 6% 35%); border: 1px solid hsl(240 6% 92%); }
        .lp-pillar-viz {
          margin-top: 24px; height: 80px; border-radius: 10px;
          background: hsl(240 6% 97%); border: 1px solid hsl(240 6% 92%);
          display: flex; align-items: center; padding: 0 18px; overflow: hidden;
        }

        .lp-arch { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 48px; }
        .lp-arch-col { background: #fff; border: 1px solid hsl(240 6% 90%); border-radius: 16px; padding: 22px; }
        .lp-arch-tier { font-family: 'Geist Mono', monospace; font-size: 10.5px; letter-spacing: 0.15em; text-transform: uppercase; color: hsl(162 47% 32%); }
        .lp-arch-col h4 { font-family: 'Fraunces', serif; font-weight: 400; font-size: 22px; margin: 8px 0 14px; letter-spacing: -0.02em; }
        .lp-arch-col ul { list-style: none; padding: 0; margin: 0; }
        .lp-arch-col li { font-size: 13px; padding: 10px 0; border-top: 1px dashed hsl(240 6% 90%); display: flex; align-items: flex-start; gap: 10px; color: hsl(240 6% 30%); }
        .lp-arch-col li:first-child { border-top: none; }
        .lp-arch-ic { width: 18px; height: 18px; border-radius: 5px; background: hsl(162 47% 39% / 0.1); color: hsl(162 47% 32%); display: grid; place-items: center; flex: none; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 600; }
        .lp-arch-col li strong { color: hsl(240 10% 10%); font-weight: 600; }

        .lp-compare { margin-top: 48px; background: #fff; border: 1px solid hsl(240 6% 90%); border-radius: 16px; overflow: hidden; }
        .lp-compare table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .lp-compare th, .lp-compare td { padding: 16px 18px; text-align: left; }
        .lp-compare thead th { font-family: 'Geist Mono', monospace; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(240 6% 45%); font-weight: 500; border-bottom: 1px solid hsl(240 6% 90%); background: hsl(240 6% 98%); }
        .lp-compare thead th.lp-cur { color: hsl(162 47% 32%); background: hsl(162 47% 39% / 0.06); }
        .lp-compare tbody td { border-top: 1px solid hsl(240 6% 94%); }
        .lp-compare tbody td.lp-feat { font-weight: 500; color: hsl(240 10% 10%); }
        .lp-compare tbody td.lp-cur { background: hsl(162 47% 39% / 0.04); }
        .lp-ccheck { color: hsl(162 47% 32%); font-weight: 600; }
        .lp-cdash { color: hsl(240 6% 70%); }

        .sdg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 48px; }
        .sdg-card { border-radius: 16px; padding: 32px; color: #fff; position: relative; overflow: hidden; min-height: 220px; display: flex; flex-direction: column; justify-content: space-between; }
        .sdg-card.sdg-11 { background: linear-gradient(135deg, #fd9d24 0%, #d97706 100%); }
        .sdg-card.sdg-15 { background: linear-gradient(135deg, #56c02b 0%, #2f7a16 100%); }
        .sdg-num { font-family: 'Geist Mono', monospace; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; opacity: .85; }
        .sdg-card h4 { font-family: 'Fraunces', serif; font-weight: 400; font-size: 30px; line-height: 1.05; letter-spacing: -0.02em; margin: 12px 0 0; }
        .sdg-card p { font-size: 14.5px; line-height: 1.55; opacity: .92; margin: 16px 0 0; max-width: 480px; }
        .sdg-mark { position: absolute; top: 24px; right: 24px; font-family: 'Fraunces', serif; font-size: 96px; font-weight: 300; opacity: 0.18; line-height: 1; letter-spacing: -0.04em; }

        .lp-team { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-top: 48px; }
        .lp-person { background: #fff; border: 1px solid hsl(240 6% 90%); border-radius: 16px; padding: 24px; }
        .lp-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, hsl(162 47% 39%), hsl(162 47% 28%)); color: #fff; display: grid; place-items: center; font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400; margin-bottom: 16px; letter-spacing: -0.02em; }
        .lp-nm { font-family: 'Fraunces', serif; font-weight: 400; font-size: 21px; letter-spacing: -0.015em; line-height: 1.2; color: hsl(240 10% 8%); }
        .lp-rl { font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(240 6% 45%); margin-top: 8px; }
        .lp-bio { font-size: 13.5px; line-height: 1.55; color: hsl(240 6% 35%); margin-top: 14px; }

        .lp-footer { border-top: 1px solid hsl(240 6% 92%); padding: 56px 0 40px; margin-top: 32px; }
        .lp-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px; }
        .lp-footer h5 { font-family: 'Geist Mono', monospace; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: hsl(240 6% 45%); margin: 0 0 14px; }
        .lp-footer a { display: block; font-size: 13.5px; color: hsl(240 6% 25%); padding: 4px 0; text-decoration: none; cursor: pointer; }
        .lp-footer-cap { font-size: 13px; line-height: 1.6; color: hsl(240 6% 35%); max-width: 320px; }
        .lp-footer-bottom { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 24px; border-top: 1px solid hsl(240 6% 92%); font-family: 'Geist Mono', monospace; font-size: 11px; color: hsl(240 6% 45%); letter-spacing: 0.05em; }

        .lp-before-after { background:#fff; border:1px solid hsl(240 6% 90%); border-radius:16px; padding:28px; }
        .lp-ba-row { display:grid; grid-template-columns:1fr auto 1fr; gap:14px; align-items:center; }
        .lp-ba-before { font-size:13.5px; color:hsl(240 6% 35%); text-decoration:line-through; }
        .lp-ba-arrow { font-family:'Geist Mono',monospace; font-size:11px; color:hsl(162 47% 32%); }
        .lp-ba-after { font-size:13.5px; color:hsl(240 10% 10%); font-weight:500; }
        .lp-ba-hr { border:none; border-top:1px dashed hsl(240 6% 88%); margin:0; }
      `}</style>

      <div className="lp-root">
        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-shell lp-nav-inner">
            <div className="lp-brand">
              <div className="lp-mark">T</div>
              <span>TERRASPEC</span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'hsl(240 6% 55%)', marginLeft: 6, borderLeft: '1px solid hsl(240 6% 85%)', paddingLeft: 10 }}>v0.1 · Capstone Build</span>
            </div>
            <div className="lp-nav-links">
              <a href="#system">The system</a>
              <a href="#pillars">Capabilities</a>
              <a href="#arch">Architecture</a>
              <a href="#compare">Compared</a>
              <a href="#team">Team</a>
            </div>
            <button className="lp-btn lp-btn-primary" onClick={() => go('dashboard')} style={{ height: 38, padding: '0 16px', fontSize: 13.5, borderRadius: 8 }}>
              Launch system
              <svg className="lp-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-shell">
            <div className="lp-hero-grid">
              <div>
                <span className="lp-eyebrow">
                  <span className="lp-dotpulse"/>
                  DAVAO DEL NORTE STATE COLLEGE · 2026
                </span>
                <h1 className="lp-h1">
                  Urban planning,<br/>
                  <em>modernized.</em>
                  <span className="lp-h1-mono">[v0.1]</span>
                </h1>
                <p className="lp-sub">
                  TERRASPEC is a Geospatial Decision Support System that replaces Panabo City's
                  paper-bound zoning workflow with a multi-criteria scoring engine, an AI chatbot
                  that reads ordinances in plain English, and an ecological module that decides
                  where each native tree belongs.
                </p>
                <div className="lp-cta-row">
                  <button className="lp-btn lp-btn-primary" onClick={() => go('dashboard')}>
                    Launch the system
                    <svg className="lp-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                  </button>
                  <a className="lp-btn lp-btn-ghost" href="#system">Read the study</a>
                </div>

                <div className="lp-hero-meta">
                  {[
                    { key: 'Domain',    val: 'Urban planning · Reforestation' },
                    { key: 'Locale',    val: 'Panabo City · 38 barangays' },
                    { key: 'Approach',  val: 'GIS + NLP + MCDA' },
                    { key: 'Aligns with', val: "SDG 11 · SDG 15 · PDP '23-28" },
                  ].map(({ key, val }) => (
                    <div key={key}>
                      <div className="lp-meta-key">{key}</div>
                      <div className="lp-meta-val">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MAP ARTWORK */}
              <div className="lp-map-card">
                {/* real map — same as Dashboard Map Overview */}
                <div style={{ position: 'absolute', inset: 22, borderRadius: 10, overflow: 'hidden' }}>
                  <Map
                    center={[125.6847, 7.307]}
                    zoom={12}
                    minZoom={10}
                    maxZoom={18}
                    dragPan={false}
                    scrollZoom={false}
                    doubleClickZoom={false}
                    touchZoomRotate={false}
                    keyboard={false}
                    dragRotate={false}
                    className="h-full w-full"
                  >
                    <MapMarker longitude={125.6847} latitude={7.307}>
                      <MarkerContent className="translate-y-[-8px]">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{ background: 'hsl(var(--brand))', color: 'white', padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Panabo City</span>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'hsl(var(--brand))', border: '2px solid white', boxShadow: '0 0 0 5px hsl(162 47% 39% / 0.2)' }}/>
                        </div>
                      </MarkerContent>
                      <MarkerTooltip>Panabo City, Davao del Norte</MarkerTooltip>
                    </MapMarker>
                    {PANABO.barangayRankings.map(p => (
                      <MapMarker key={p.barangay} longitude={125.6847 + (Math.sin(p.barangay.charCodeAt(0)) * 0.08)} latitude={7.307 + (Math.cos(p.barangay.charCodeAt(0)) * 0.06)}>
                        <MarkerContent>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.score >= 75 ? 'hsl(162 47% 39%)' : p.score >= 50 ? 'hsl(38 92% 50%)' : 'hsl(0 72% 51%)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}/>
                        </MarkerContent>
                        <MarkerTooltip>{p.barangay} · {p.score}%</MarkerTooltip>
                      </MapMarker>
                    ))}
                  </Map>
                </div>

                <div className="lp-map-pill" style={{ top: 28, left: 42 }}>
                  <div className="lp-pill-label">TOP BARANGAY</div>
                  <div className="lp-pill-val">Poblacion · 91%</div>
                  <div style={{ height: 4, background: 'hsl(240 6% 92%)', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: '91%', height: '100%', background: 'hsl(162 47% 39%)' }}/>
                  </div>
                </div>
                <div className="lp-map-pill" style={{ top: 28, right: 42, background: 'rgba(254,242,242,0.95)', borderColor: 'hsl(0 70% 60% / 0.4)' }}>
                  <div className="lp-pill-label" style={{ color: 'hsl(0 70% 40%)' }}>⚠ ENV FLAG</div>
                  <div className="lp-pill-val" style={{ color: 'hsl(0 70% 35%)' }}>Mangrove buffer</div>
                </div>
                <div className="lp-map-pill" style={{ bottom: 28, left: 42 }}>
                  <div className="lp-pill-label">SPECIES MATCH</div>
                  <div className="lp-pill-val">Narra · 94%</div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="lp-shell" style={{ paddingBottom: 32 }}>
          <div className="lp-stats">
            {[
              { v: '38',    em: false, k: 'Barangays mapped',      note: "Full coverage of Panabo's administrative units, 2020 onward." },
              { v: '7',     em: false, k: 'Suitability criteria',  note: 'Road, flood, slope, soil, zoning, restriction, lot size.' },
              { v: '94%',   em: true,  k: 'Species-site accuracy', note: 'Native trees matched against soil + topography.' },
              { v: '0',     em: false, k: 'Paper forms',           note: 'Manual zoning review replaced by NLP + MCDA.' },
            ].map(({ v, em, k, note }) => (
              <div key={k}>
                <div className="lp-stat-v">{em ? <em>{v}</em> : v}</div>
                <div className="lp-stat-k">{k}</div>
                <div className="lp-stat-note">{note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* THE SHIFT */}
        <section id="system" className="lp-section">
          <div className="lp-shell">
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'start' }}>
              <div>
                <div className="lp-section-tag">— The shift</div>
                <h2 className="lp-section-h">From <em>scanned PDFs</em> and site visits to a single, queryable map of the city.</h2>
                <p className="lp-section-lead">
                  Panabo City, an agro-industrial hub in Davao del Norte, still runs much of its
                  urban land management on paper records and unsearchable scans. Zoning is hard
                  to interpret, environmental boundaries are invisible to developers, and reforestation
                  drives lose trees because species don't match the site.
                </p>
                <p className="lp-section-lead">
                  TERRASPEC consolidates the city's zoning ordinances, soil and topographic data,
                  and protected-area boundaries into one decision-support layer — accessible through
                  a chatbot, an interactive map, and an automated report writer.
                </p>
              </div>

              <div className="lp-before-after">
                <div className="lp-section-tag" style={{ marginBottom: 18 }}>— Before · After</div>
                <div style={{ display: 'grid', gap: 14 }}>
                  {[
                    ['Walk to City Hall, request map.', 'Ask the chatbot in plain English.'],
                    ['Eyeball overlap with hazard maps.', 'Auto-flagged via spatial overlay.'],
                    ['Guess which species survives.', 'Native species matched to soil + slope.'],
                    ['Type a memo, attach screenshots.', 'One-click PDF report.'],
                  ].map(([before, after], i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <hr className="lp-ba-hr"/>}
                      <div className="lp-ba-row">
                        <div className="lp-ba-before">{before}</div>
                        <span className="lp-ba-arrow">→</span>
                        <div className="lp-ba-after">{after}</div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section id="pillars" className="lp-section">
          <div className="lp-shell">
            <div className="lp-section-tag">— Four pillars</div>
            <h2 className="lp-section-h">Each capability maps to a <em>specific objective</em> of the study.</h2>
            <div className="lp-pillars">
              <div className="lp-pillar">
                <span className="lp-pillar-num">OBJECTIVE 01</span>
                <h3>An interface that reads ordinances, not buttons.</h3>
                <p>The NLP layer translates queries like "show residential parcels near a school, no flood risk" into structured spatial filters. Powered by an Ollama LLM with a Gemini 2.5 Flash fallback.</p>
                <div className="lp-pillar-viz" style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12.5, color: 'hsl(240 10% 12%)' }}>
                  <span style={{ color: 'hsl(240 6% 50%)' }}>&gt;</span>&nbsp;Find residential zones near a school
                  <span style={{ display: 'inline-block', width: 7, height: 14, background: 'hsl(162 47% 39%)', marginLeft: 6, animation: 'lpdotpulse 1s steps(1) infinite' }}/>
                </div>
                <div className="lp-pillar-stack">
                  {['Ollama','Gemini 2.5 Flash','Intent parser'].map(t => <span key={t} className="lp-tech">{t}</span>)}
                </div>
              </div>

              <div className="lp-pillar">
                <span className="lp-pillar-num">OBJECTIVE 02</span>
                <h3>A weighted scoring engine that explains itself.</h3>
                <p>Multi-Criteria Decision Analysis combines road proximity, lot size, flood risk and zoning constraints into a single suitability percentage — with every weight transparent and tunable by LGU planners.</p>
                <div className="lp-pillar-viz" style={{ gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: 'hsl(240 6% 45%)', width: 90 }}>Flood risk</span>
                    <div style={{ flex: 1, height: 6, background: 'hsl(240 6% 92%)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: '85%', height: '100%', background: 'hsl(0 70% 60%)' }}/>
                    </div>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, width: 28, textAlign: 'right' }}>0.32</span>
                  </div>
                </div>
                <div className="lp-pillar-stack">
                  {['AHP','Weighted Linear Combination','Laravel'].map(t => <span key={t} className="lp-tech">{t}</span>)}
                </div>
              </div>

              <div className="lp-pillar">
                <span className="lp-pillar-num">OBJECTIVE 03</span>
                <h3>An overlay that says no to encroachment.</h3>
                <p>The spatial overlay module compares proposals against mangrove parks and ecological reserves, automatically flagging — and refusing to score — any parcel inside a protected boundary.</p>
                <div className="lp-pillar-viz" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                  <svg viewBox="0 0 300 80" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <pattern id="lp-hatch2" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(0 70% 55% / 0.4)" strokeWidth="1.5"/>
                      </pattern>
                    </defs>
                    <rect width="300" height="80" fill="hsl(240 6% 97%)"/>
                    <rect x="40" y="14" width="80" height="52" rx="4" fill="hsl(220 70% 55% / 0.25)" stroke="hsl(220 70% 45%)" strokeWidth="1"/>
                    <rect x="90" y="22" width="80" height="44" rx="4" fill="url(#lp-hatch2)" stroke="hsl(0 70% 50%)" strokeWidth="1" strokeDasharray="3 3"/>
                    <text x="200" y="40" fontFamily="Geist Mono" fontSize="11" fill="hsl(0 70% 35%)" fontWeight="600">⚠ OVERLAP</text>
                    <text x="200" y="56" fontFamily="Geist Mono" fontSize="10" fill="hsl(240 6% 40%)">Mangrove buffer</text>
                  </svg>
                </div>
                <div className="lp-pillar-stack">
                  {['Mapcn API','Spatial overlay','SQLite spatial'].map(t => <span key={t} className="lp-tech">{t}</span>)}
                </div>
              </div>

              <div className="lp-pillar">
                <span className="lp-pillar-num">OBJECTIVE 04</span>
                <h3>The right tree for the right soil.</h3>
                <p>A species-matching module cross-references soil pH, texture, elevation and temperature against a registry of native flora — turning reforestation from guesswork into a 94% accurate match.</p>
                <div className="lp-pillar-viz" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, color: 'hsl(240 6% 45%)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Suggested</div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, letterSpacing: '-0.01em' }}>Narra · Molave · Lauan</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, color: 'hsl(240 6% 45%)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Match</div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: 'hsl(162 47% 32%)', fontWeight: 500, letterSpacing: '-0.02em' }}>94%</div>
                  </div>
                </div>
                <div className="lp-pillar-stack">
                  {['PHP rules engine','Soil + slope data','Native species registry'].map(t => <span key={t} className="lp-tech">{t}</span>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE */}
        <section id="arch" className="lp-section">
          <div className="lp-shell">
            <div className="lp-section-tag">— Under the hood</div>
            <h2 className="lp-section-h">A three-tier architecture for spatial decisions.</h2>
            <p className="lp-section-lead">Presentation, application and data layers — built on a self-hosted Laravel stack that keeps Panabo's records inside Panabo's network.</p>
            <div className="lp-arch">
              {[
                {
                  tier: 'TIER 01 · PRESENTATION', title: "What the citizen sees.",
                  items: [
                    ['①', 'Ollama AI Assistant', 'handles unstructured public queries.'],
                    ['②', 'Zoning & Suitability Map', 'renders color-coded polygons with environmental alerts.'],
                    ['③', 'Analytics & Report', 'panel for LGU planners.'],
                  ],
                  style: {},
                },
                {
                  tier: 'TIER 02 · APPLICATION', title: 'Where decisions happen.',
                  items: [
                    ['①', 'Intent parser', 'turns text into spatial filters.'],
                    ['②', 'MCDA engine', 'computes suitability with planner-tunable weights.'],
                    ['③', 'Species matcher', 'resolves soil + elevation → native flora.'],
                    ['④', 'DomPDF report writer', 'generates official documents.'],
                  ],
                  style: { background: 'hsl(162 47% 39% / 0.04)', borderColor: 'hsl(162 47% 39% / 0.25)' },
                },
                {
                  tier: 'TIER 03 · DATA', title: 'What the city owns.',
                  items: [
                    ['①', 'Zoning polygons', 'from the official CLUP.'],
                    ['②', 'Soil & topographic', 'datasets for ecological matching.'],
                    ['③', 'MCDA weight tables', 'versioned per analysis.'],
                    ['④', 'SQLite spatial DB', 'hosted via Laragon.'],
                  ],
                  style: {},
                },
              ].map(({ tier, title, items, style }) => (
                <div key={tier} className="lp-arch-col" style={style}>
                  <div className="lp-arch-tier">{tier}</div>
                  <h4>{title}</h4>
                  <ul>
                    {items.map(([ic, strong, rest]) => (
                      <li key={ic}><span className="lp-arch-ic">{ic}</span><div><strong>{strong}</strong> {rest}</div></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARE */}
        <section id="compare" className="lp-section">
          <div className="lp-shell">
            <div className="lp-section-tag">— Where it fits</div>
            <h2 className="lp-section-h">Existing tools digitize records. <em>TERRASPEC decides.</em></h2>
            <p className="lp-section-lead">Other municipal GIS portals stop at visualization. TERRASPEC adds multi-criteria scoring, a conversational interface and a reforestation module in one platform.</p>
            <div className="lp-compare">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '34%' }}>Capability</th>
                    <th className="lp-cur" style={{ textAlign: 'center' }}>TerraSpec</th>
                    <th style={{ textAlign: 'center' }}>QC Zoning Viewer</th>
                    <th style={{ textAlign: 'center' }}>Davao GIS Map</th>
                    <th style={{ textAlign: 'center' }}>ArcGIS Urban</th>
                    <th style={{ textAlign: 'center' }}>i-Tree Eco</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Cloud-based map viewer',            true,  true,  true,  true,  false],
                    ['Official zoning visualizations',    true,  true,  true,  true,  false],
                    ['Multi-criteria suitability (MCDA)', true,  false, false, true,  false],
                    ['Environmental parameter analysis',  true,  false, false, true,  true ],
                    ['AI-powered chatbot (NLP)',           true,  false, false, false, false],
                    ['Automated suitability scoring',     true,  false, false, true,  false],
                    ['Reforestation & species matching',  true,  false, false, false, true ],
                    ['Automated analytics reporting',     true,  false, false, false, true ],
                  ].map(([feat, ...vals]) => (
                    <tr key={feat}>
                      <td className="lp-feat">{feat}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={i === 0 ? 'lp-cur' : ''} style={{ textAlign: 'center' }}>
                          {v ? <span className="lp-ccheck">✓</span> : <span className="lp-cdash">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SDG */}
        <section className="lp-section">
          <div className="lp-shell">
            <div className="lp-section-tag">— Aligned with</div>
            <h2 className="lp-section-h">Two Sustainable Development Goals, one decision layer.</h2>
            <div className="sdg-grid">
              <div className="sdg-card sdg-11">
                <span className="sdg-mark">11</span>
                <div>
                  <div className="sdg-num">SDG 11</div>
                  <h4>Sustainable Cities &amp; Communities</h4>
                  <p>By digitizing zoning compliance, TERRASPEC ensures Panabo's growth remains organized and adheres to legal safeguards that prevent urban sprawl into agricultural land.</p>
                </div>
                <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, opacity: .85, letterSpacing: '0.1em' }}>→ INCLUSIVE URBAN PLANNING</div>
              </div>
              <div className="sdg-card sdg-15">
                <span className="sdg-mark">15</span>
                <div>
                  <div className="sdg-num">SDG 15</div>
                  <h4>Life on Land</h4>
                  <p>Reforestation success depends on matching species to site. TERRASPEC raises native species suitability from a baseline 54% to up to 99% by reading biophysical conditions per parcel.</p>
                </div>
                <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, opacity: .85, letterSpacing: '0.1em' }}>→ SPECIES-SITE MATCHING</div>
              </div>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="team" className="lp-section">
          <div className="lp-shell">
            <div className="lp-section-tag">— The researchers</div>
            <h2 className="lp-section-h">A three-person team out of the <em>Institute of Computing.</em></h2>
            <p className="lp-section-lead">Davao del Norte State College · Bachelor of Science in Information Technology · March 2026.</p>
            <div className="lp-team">
              {[
                { initials: 'AT', name: 'Abegail C. Tacogue',    role: 'System Analyst',   bio: "Gathers zoning requirements from the LGU, defines MCDA logic, and verifies that the platform meets the city's sustainable planning needs." },
                { initials: 'ES', name: 'Everjay G. Salango',    role: 'Programmer',       bio: 'Builds the Web-GIS interface, implements the suitability scoring engine, and integrates the AI-driven NLP chatbot.' },
                { initials: 'HI', name: 'Hannah Mae B. Inting',  role: 'Documentarian',   bio: 'Records every Agile phase, integration test, and produces the technical and user manuals that ship with the system to LGU officials.' },
              ].map(({ initials, name, role, bio }) => (
                <div key={name} className="lp-person">
                  <div className="lp-avatar">{initials}</div>
                  <div className="lp-nm">{name}</div>
                  <div className="lp-rl">{role}</div>
                  <p className="lp-bio">{bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section className="lp-section" style={{ borderTop: 'none', paddingTop: 48, paddingBottom: 48 }}>
          <div className="lp-shell">
            <div style={{ background: 'hsl(240 10% 8%)', borderRadius: 20, padding: '64px 56px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(circle at 20% 30%, hsl(162 55% 50%) 0%, transparent 35%), radial-gradient(circle at 80% 70%, hsl(28 80% 55%) 0%, transparent 40%)' }}/>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'hsl(162 55% 60%)', marginBottom: 14 }}>— Now go decide</div>
                  <h3 style={{ fontFamily: "'Fraunces',serif", fontWeight: 300, fontSize: 48, lineHeight: 1.05, letterSpacing: '-0.025em', margin: 0 }}>
                    Open the system and<br/>score your first <em style={{ color: 'hsl(162 55% 60%)' }}>parcel.</em>
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="lp-btn" onClick={() => go('dashboard')} style={{ background: '#fff', color: 'hsl(240 10% 8%)', height: 54, fontSize: 15, justifyContent: 'space-between', padding: '0 22px', borderRadius: 10 }}>
                    Launch TERRASPEC
                    <svg className="lp-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                  </button>
                  <a className="lp-btn" href="#system" style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', height: 54, fontSize: 15, justifyContent: 'space-between', padding: '0 22px', borderRadius: 10 }}>
                    Read the methodology
                    <svg className="lp-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-shell">
            <div className="lp-footer-grid">
              <div>
                <div className="lp-brand" style={{ marginBottom: 14 }}>
                  <div className="lp-mark">T</div>
                  <span>TERRASPEC</span>
                </div>
                <p className="lp-footer-cap">A Geospatial Decision Support System for Multi-Sectoral Land Suitability Optimization and Spatial Analytics. In partial fulfillment of the BS Information Technology degree.</p>
              </div>
              <div>
                <h5>System</h5>
                <a onClick={() => go('dashboard')}>Launch app</a>
                <a href="#pillars">Capabilities</a>
                <a href="#arch">Architecture</a>
              </div>
              <div>
                <h5>Study</h5>
                <a href="#system">Background</a>
                <a href="#compare">Comparative review</a>
                <a href="#team">Researchers</a>
              </div>
              <div>
                <h5>Institution</h5>
                <a>Davao del Norte State College</a>
                <a>Institute of Computing</a>
                <a>Panabo City, Davao del Norte</a>
              </div>
            </div>
            <div className="lp-footer-bottom">
              <span>© 2026 TERRASPEC · CAPSTONE PROJECT</span>
              <span>BUILT WITH LARAVEL · OLLAMA · MAPCN · SQLITE</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
