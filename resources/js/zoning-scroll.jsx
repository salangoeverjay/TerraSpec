import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ZONING_LEGEND } from './data.js';

const HEX = Object.fromEntries(ZONING_LEGEND.map(z => [z.id, z.hex]));
const LABEL = Object.fromEntries(ZONING_LEGEND.map(z => [z.id, z.label]));

// The story: each chapter reveals a group of zoning classes and points the camera at where they lie.
// Hectares and shares are summed from the zoning map itself, never typed in.
const CHAPTERS = [
  // pitch tilts the map away from the viewer (degrees), turn rotates it slightly; flat at the start
  { key: 'city',    classes: [],                                         focus: null, zoom: 1,    pitch: 0,  turn: 0 },
  { key: 'farm',    classes: ['PA', 'AI'],                               focus: null, zoom: 1.08, pitch: 22, turn: -4 },
  { key: 'homes',   classes: ['GR', 'R-1'],                              focus: 'GR', zoom: 2.3,  pitch: 40, turn: 6 },
  { key: 'trade',   classes: ['GC', 'C', 'I', 'UTS', 'INS', 'TZ', 'QZ'], focus: 'GC', zoom: 2.5,  pitch: 44, turn: -5 },
  { key: 'green',   classes: ['FR', 'MG', 'PRC', 'BG'],                  focus: null, zoom: 1, pitch: 26, turn: 3 },
  { key: 'all',     classes: [],                                         focus: null, zoom: 1,    pitch: 14, turn: 0 },
];

// Panabo City centre, the same point the hero map is centred on
const CITY_CENTRE = [125.6847, 7.307];

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = t => t * t * (3 - 2 * t);
const ha = v => `${Math.round(v).toLocaleString()} ha`;
const pct = v => `${v.toFixed(1)}%`;

// One request for the landing page: the hero's map sheet and this scene share the file
let zoningMapRequest = null;
export function loadZoningMap() {
  zoningMapRequest ??= fetch('/data/zoning_2020_landing.json').then(r => (r.ok ? r.json() : null)).catch(() => null);
  return zoningMapRequest;
}

function useZoningMap(sectionRef) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    // Wait until the visitor is about a screen away (the hero usually has the file loaded by then)
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      loadZoningMap().then(setMap);
    }, { rootMargin: '100% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [sectionRef]);
  return map;
}

export function ZoningScroll() {
  const sectionRef = useRef(null);
  const stepRefs = useRef([]);
  const map = useZoningMap(sectionRef);
  const [progress, setProgress] = useState(0);
  const [isolated, setIsolated] = useState(null);
  const mapBoxRef = useRef(null);
  const [mapBox, setMapBox] = useState({ w: 600, h: 800 });
  useEffect(() => {
    const el = mapBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setMapBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const reduceMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  const byId = useMemo(() => Object.fromEntries((map?.classes ?? []).map(c => [c.id, c])), [map]);
  const total = useMemo(() => (map?.classes ?? []).reduce((s, c) => s + c.ha, 0), [map]);
  const groupHa = ids => ids.reduce((s, id) => s + (byId[id]?.ha ?? 0), 0);

  // Scroll position -> a continuous chapter index: n when step n's card sits in the middle of the screen,
  // fractions in between, and from -1 to 0 while the first card rises from the bottom edge
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      // On a phone the map sticks to the top, so cards are read in the space below it
      const stage = sectionRef.current?.querySelector('.zs-stage');
      const narrow = window.matchMedia('(max-width: 900px)').matches;
      const mid = narrow && stage ? (stage.getBoundingClientRect().bottom + window.innerHeight) / 2 : window.innerHeight / 2;
      const centres = stepRefs.current.filter(Boolean).map(el => {
        const r = el.querySelector('.zs-step-card').getBoundingClientRect();
        return r.top + r.height / 2;
      });
      if (!centres.length) return;
      let f;
      if (mid <= centres[0]) {
        f = Math.max(-1, (mid - centres[0]) / mid);
      } else if (mid >= centres[centres.length - 1]) {
        f = centres.length - 1;
      } else {
        const i = centres.findIndex((c, k) => mid >= c && mid < centres[k + 1]);
        f = i + (mid - centres[i]) / (centres[i + 1] - centres[i]);
      }
      setProgress(f);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, [map]);

  const chapter = Math.min(CHAPTERS.length - 1, Math.max(0, Math.round(progress)));

  // Camera: hold while a card is centred, travel to the next chapter's view between cards
  const cameraFor = c => {
    const ch = CHAPTERS[c];
    // A focus of several classes aims at their area-weighted centre
    const parts = [ch.focus ?? []].flat().map(id => byId[id]).filter(Boolean);
    const weight = parts.reduce((sum, c) => sum + c.ha, 0);
    const x = weight ? parts.reduce((sum, c) => sum + c.cx * c.ha, 0) / weight : map.width / 2;
    const y = weight ? parts.reduce((sum, c) => sum + c.cy * c.ha, 0) / weight : map.height / 2;
    return { x, y, z: ch.zoom, pitch: ch.pitch, turn: ch.turn };
  };
  let viewBox = '0 0 700 964';
  let plane = 'none';
  let edge = 0;
  if (map) {
    const base = Math.max(0, Math.floor(progress));
    const a = cameraFor(Math.min(base, CHAPTERS.length - 1));
    const b = cameraFor(Math.min(base + 1, CHAPTERS.length - 1));
    const t = reduceMotion ? (progress - base >= 0.5 ? 1 : 0) : smooth(clamp01((progress - base - 0.25) / 0.6));
    const z = a.z + (b.z - a.z) * t, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    const w = map.width / z, h = map.height / z;
    viewBox = `${(x - w / 2).toFixed(1)} ${(y - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
    // The map lies on a tilted plane, like a camera looking across the city; it scales up a little so
    // the far edge still fills the frame, and the slab edge under the land keeps a constant thickness
    if (!reduceMotion) {
      const pitch = a.pitch + (b.pitch - a.pitch) * t, turn = a.turn + (b.turn - a.turn) * t;
      plane = `rotateX(${pitch.toFixed(2)}deg) rotateZ(${turn.toFixed(2)}deg) scale(${(1 + pitch / 260).toFixed(3)})`;
      edge = (pitch / 44) * 7 / z;
    }
  }

  // Each class fades in while its chapter's step reaches the reading line; the chapter in view is lit,
  // earlier ones step back, and the last chapter shows everything (or the class picked in its legend)
  const chapterOf = id => CHAPTERS.findIndex(ch => ch.classes.includes(id));
  const opacityOf = id => {
    if (chapter === CHAPTERS.length - 1 && progress > CHAPTERS.length - 1.35) {
      return isolated ? (isolated === id ? 1 : 0.12) : 1;
    }
    const c = chapterOf(id);
    const shown = reduceMotion ? (progress >= c - 0.5 ? 1 : 0) : clamp01((progress - (c - 0.65)) / 0.5);
    return shown * (c === chapter ? 1 : 0.4);
  };
  const outlineDrawn = reduceMotion ? 1 : clamp01((progress + 1) / 0.8);
  const revealedHa = CHAPTERS.slice(1, 5).reduce((s, ch, i) => s + groupHa(ch.classes) * clamp01((progress - (i + 0.35)) / 0.5), 0);
  const finale = progress > CHAPTERS.length - 1.35;

  // Barangay names in the zoomed chapters: the few that hold the most of that chapter's zoning and sit in
  // the camera's view, shown only while the camera holds, at a fixed size on screen
  const labels = [];
  if (map) {
    for (const c of [2, 3, 4]) {
      const fade = reduceMotion ? (chapter === c ? 1 : 0) : clamp01((0.3 - Math.abs(progress - c)) / 0.1);
      if (fade <= 0) continue;
      const cam = cameraFor(c);
      const w = map.width / cam.z, h = map.height / cam.z;
      const unitPx = Math.min(mapBox.w / w, mapBox.h / h);
      const limit = mapBox.w < 600 ? 3 : 4;
      const placed = [];
      map.barangayLabels
        .map(b => ({ ...b, ha: CHAPTERS[c].classes.reduce((sum, id) => sum + (b.zones[id] ?? 0), 0) }))
        .filter(b => b.ha > 0 && Math.abs(b.x - cam.x) < w * 0.44 && Math.abs(b.y - cam.y) < h * 0.45)
        .sort((a, b) => b.ha - a.ha)
        .filter((b, i, list) => b.ha >= list[0].ha * 0.2)
        .forEach(b => {
          const clash = placed.some(o => Math.abs(o.x - b.x) * unitPx < 110 && Math.abs(o.y - b.y) * unitPx < 26);
          if (placed.length < limit && !clash) placed.push(b);
        });
      placed.forEach(b => labels.push({ ...b, key: `${c}-${b.name}`, fade, size: 13 / unitPx }));
    }
  }
  const pin = map ? [
    (CITY_CENTRE[0] - map.project.minx) * map.project.cosLat * map.project.k,
    (map.project.maxy - CITY_CENTRE[1]) * map.project.k,
  ] : [0, 0];

  const homes = groupHa(CHAPTERS[2].classes), trade = groupHa(CHAPTERS[3].classes), green = groupHa(CHAPTERS[4].classes);
  const farm = groupHa(CHAPTERS[1].classes);

  const steps = [
    {
      title: 'Panabo City, on one map',
      text: map
        ? `The Integrated Zoning Map 2020–2029 divides the city's ${map.barangays} barangays into ${map.classes.length} zones covering ${ha(total)}.`
        : 'The Integrated Zoning Map 2020–2029 divides the city into zones, from farmland to mangroves.',
    },
    { title: 'Most of it is farmland', figure: farm, share: farm / total, ids: CHAPTERS[1].classes,
      text: 'Production agriculture covers the plains around the city centre, with small agri-industrial pockets.' },
    { title: 'Where people live', figure: homes, share: homes / total, ids: CHAPTERS[2].classes,
      text: 'General Residential and R-1 zones gather around the urban core.' },
    { title: 'Trade, industry and services', figure: trade, share: trade / total, ids: CHAPTERS[3].classes,
      text: 'Commercial, industrial, institutional, tourism, utilities and quarry zones.' },
    { title: 'What stays green', figure: green, share: green / total, ids: CHAPTERS[4].classes,
      text: 'Forest reserve, mangroves, parks and greenbelts, kept out of development.' },
    { title: 'Every zone, one answer away', ids: (map?.classes ?? []).map(c => c.id), live: true,
      text: 'Pick a zone to see it alone. In the Map Viewer, click any point to read its zone, hazards and suitability.' },
  ];

  return (
    <section ref={sectionRef} className="lp-section zs" id="zoning" aria-labelledby="zs-title">
      <style>{ZS_CSS}</style>
      <div className="lp-shell">
        <h2 id="zs-title" className="lp-section-h">The city's zoning, layer by layer</h2>
        <p className="lp-section-lead">Scroll through Panabo City's zoning ordinance, drawn from the same map the Map Viewer uses.</p>

        <div className="zs-grid">
          <div className="zs-stage">
            <div className="zs-map" ref={mapBoxRef}>
              {map ? (
                <div className="zs-plane" style={{ transform: plane }}>
                <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img"
                  aria-label={`Zoning map of Panabo City, ${map.classes.length} zones over ${ha(total)}`}>
                  {edge > 0 && <path d={map.outline} className="zs-edge" transform={`translate(0 ${edge.toFixed(2)})`}/>}
                  <path d={map.outline} className="zs-land"/>
                  {map.classes.map(c => (
                    <path key={c.id} d={c.path} fill={HEX[c.id] ?? '#888'} fillRule="evenodd"
                      style={{ opacity: opacityOf(c.id) }} className="zs-zone"/>
                  ))}
                  <path d={map.outline} pathLength="1" className="zs-lines"
                    style={{ strokeDasharray: 1, strokeDashoffset: 1 - outlineDrawn }}/>
                  {labels.map(l => (
                    <text key={l.key} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" className="zs-brgy"
                      style={{ opacity: l.fade, fontSize: l.size, strokeWidth: l.size * 0.32 }}>{l.name}</text>
                  ))}
                  <g className={`zs-pin${finale ? ' on' : ''}`} transform={`translate(${pin[0].toFixed(1)} ${pin[1].toFixed(1)})`}>
                    <g className="zs-pin-drop">
                      <path d="M0 0 C -12 -19 -15 -24 -15 -31 A 15 15 0 1 1 15 -31 C 15 -24 12 -19 0 0 Z" className="zs-pin-body"/>
                      <circle cy="-31" r="5.5" fill="#fff"/>
                      <text x="-22" y="-26" textAnchor="end" className="zs-pin-label">City centre</text>
                    </g>
                  </g>
                </svg>
                </div>
              ) : (
                <div className="zs-loading" aria-hidden="true"/>
              )}
              <div className={`zs-counter${finale ? ' done' : ''}`} aria-live="off">
                <span className="zs-counter-v">{ha(finale ? (isolated ? byId[isolated].ha : total) : revealedHa)}</span>
                <span className="zs-counter-k">{finale ? (isolated ? `${LABEL[isolated]} · ${pct(byId[isolated].ha / total * 100)}` : 'Panabo City · zoned') : 'zoned so far'}</span>
              </div>
            </div>
          </div>

          <ol className="zs-steps">
            {steps.map((s, i) => (
              <li key={i} ref={el => { stepRefs.current[i] = el; }} className={`zs-step${i === chapter ? ' is-on' : ''}`}>
                <div className="zs-step-card">
                  <h3>{s.title}</h3>
                  {s.figure != null && map && (
                    <p className="zs-figure">{ha(s.figure)} <span>{pct(s.share * 100)} of the city</span></p>
                  )}
                  <p className="zs-text">{s.text}</p>
                  {s.ids && map && (
                    <ul className={`zs-legend${s.live ? ' live' : ''}`}>
                      {s.ids.filter(id => byId[id]).map(id => {
                        const body = (
                          <>
                            <span className="zs-sw" style={{ background: HEX[id] }}/>
                            <span className="zs-lname">{LABEL[id] ?? byId[id].name}</span>
                            <span className="zs-lha">{ha(byId[id].ha)}</span>
                          </>
                        );
                        return (
                          <li key={id}>
                            {s.live ? (
                              <button type="button" aria-pressed={isolated === id}
                                className={isolated && isolated !== id ? 'dim' : ''}
                                onClick={() => setIsolated(v => (v === id ? null : id))}>{body}</button>
                            ) : <span className="zs-lrow">{body}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="zs-source">Source: Panabo City Integrated Zoning Map C.Y. 2020–2029 (CPDO / DHSUD XI), digitised for TerraSpec. Areas from the digitised map.</p>
      </div>
    </section>
  );
}

const ZS_CSS = `
  .zs-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 56px; margin-top: 48px; }
  .zs-stage { position: relative; }
  .zs-map {
    position: sticky; top: 88px; height: calc(100vh - 120px); max-height: 860px;
    background: hsl(160 18% 93%); border-radius: 16px; overflow: hidden;
  }
  .zs-map { perspective: 1400px; perspective-origin: 50% 30%; }
  .zs-plane { width: 100%; height: 100%; transform-origin: 50% 55%; will-change: transform; }
  .zs-map svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .zs-edge { fill: hsl(150 8% 70%); }
  .zs-land { fill: hsl(150 10% 84%); }
  .zs-zone { transition: opacity .35s ease; }
  .zs-lines { fill: none; stroke: #fff; stroke-width: 0.9; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  .zs-loading { position: absolute; inset: 0; background: hsl(160 18% 90%); animation: zs-pulse 1.4s ease-in-out infinite; }
  @keyframes zs-pulse { 50% { opacity: .55; } }

  .zs-pin { opacity: 0; transition: opacity .2s; }
  .zs-pin.on { opacity: 1; }
  .zs-pin-drop { transform: translateY(-40px); transition: transform .5s cubic-bezier(.3,1.6,.5,1); }
  .zs-pin.on .zs-pin-drop { transform: translateY(0); }
  .zs-pin-body { fill: hsl(240 10% 8%); stroke: #fff; stroke-width: 2.5; vector-effect: non-scaling-stroke; }
  .zs-brgy { font-family: 'Geist', sans-serif; font-weight: 600; fill: hsl(240 10% 10%); stroke: rgb(255 255 255 / 0.92); paint-order: stroke; stroke-linejoin: round; pointer-events: none; }
  .zs-pin-label { font-family: 'Geist', sans-serif; font-size: 22px; font-weight: 600; fill: hsl(240 10% 8%); stroke: #fff; stroke-width: 5px; paint-order: stroke; stroke-linejoin: round; }

  .zs-counter {
    position: absolute; left: 20px; bottom: 20px; background: #fff; border-radius: 12px; padding: 12px 16px;
    display: flex; flex-direction: column; gap: 2px; min-width: 190px;
  }
  .zs-counter-v { font-family: 'Fraunces', serif; font-size: 32px; line-height: 1; letter-spacing: -0.02em; color: hsl(240 10% 8%); font-variant-numeric: tabular-nums; }
  .zs-counter-k { font-size: 13px; color: hsl(240 6% 35%); }
  .zs-counter.done .zs-counter-v { color: hsl(162 47% 30%); }

  .zs-steps { list-style: none; margin: 0; padding: 0; }
  .zs-step { min-height: 78vh; display: flex; align-items: center; }
  .zs-step:last-child { min-height: 100vh; }
  .zs-step-card { opacity: .35; transform: translateY(16px); transition: opacity .4s ease, transform .4s ease; max-width: 460px; }
  .zs-step.is-on .zs-step-card { opacity: 1; transform: none; }
  .zs-step h3 { font-family: 'Fraunces', serif; font-weight: 400; font-size: clamp(28px, 3vw, 40px); line-height: 1.05; letter-spacing: -0.02em; margin: 0 0 14px; color: hsl(240 10% 8%); }
  .zs-figure { font-family: 'Fraunces', serif; font-size: 44px; line-height: 1; letter-spacing: -0.02em; margin: 0 0 14px; color: hsl(162 47% 28%); font-variant-numeric: tabular-nums; }
  .zs-figure span { display: block; font-family: 'Geist', sans-serif; font-size: 15px; letter-spacing: 0; color: hsl(240 6% 35%); margin-top: 8px; }
  .zs-text { font-size: 17px; line-height: 1.55; color: hsl(240 10% 12%); margin: 0; }
  .zs-legend { list-style: none; padding: 0; margin: 20px 0 0; display: grid; gap: 6px; }
  .zs-legend.live { gap: 0; margin-top: 16px; }
  .zs-legend.live button { padding: 4px 8px; }
  .zs-lrow, .zs-legend button { display: flex; align-items: center; gap: 10px; width: 100%; font-size: 14.5px; color: hsl(240 10% 12%); }
  .zs-legend button {
    background: none; border: none; padding: 6px 8px; margin: 0 -8px; border-radius: 8px; text-align: left; font: inherit; font-size: 14px; cursor: pointer;
    transition: background-color .15s, opacity .15s;
  }
  .zs-legend button:hover { background: hsl(160 18% 93%); }
  .zs-legend button[aria-pressed="true"] { background: hsl(160 18% 90%); font-weight: 600; }
  .zs-legend button.dim { opacity: .45; }
  .zs-legend button:focus-visible { outline: 2px solid hsl(162 47% 32%); outline-offset: 1px; }
  .zs-sw { width: 14px; height: 14px; border-radius: 3px; flex: none; }
  .zs-lname { flex: 1; min-width: 0; }
  .zs-lha { color: hsl(240 6% 35%); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .zs-source { font-size: 13px; color: hsl(240 6% 40%); margin: 24px 0 0; max-width: 720px; }

  @media (max-width: 900px) {
    .zs-grid { grid-template-columns: 1fr; gap: 0; margin-top: 28px; }
    .zs-stage { position: sticky; top: 64px; z-index: 2; }
    .zs-map { position: relative; top: 0; height: 46vh; border-radius: 12px; }
    .zs-counter { left: 10px; bottom: 10px; padding: 8px 12px; min-width: 0; }
    .zs-counter-v { font-size: 22px; }
    .zs-step { min-height: 70vh; align-items: flex-start; padding-top: 24px; }
    .zs-step:last-child { min-height: 80vh; }
    .zs-step-card { background: #fbfaf7; }
    .zs-figure { font-size: 34px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .zs-zone, .zs-step-card, .zs-pin-drop { transition: none; }
    .zs-step-card { transform: none; }
    .zs-loading { animation: none; }
  }
`;
