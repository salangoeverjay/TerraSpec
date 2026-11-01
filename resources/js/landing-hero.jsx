import React, { useEffect, useRef, useState } from 'react';
import { ZONING_LEGEND } from './data.js';
import { loadZoningMap } from './zoning-scroll.jsx';

const HEX = Object.fromEntries(ZONING_LEGEND.map(z => [z.id, z.hex]));
const LABEL = Object.fromEntries(ZONING_LEGEND.map(z => [z.id, z.label]));
const ha = v => `${Math.round(v).toLocaleString()} ha`;

/**
 * The landing page's first screen: Panabo City's printed zoning map sheet, the paper TerraSpec
 * replaces, set on a plain white field. Pointing at the sheet's map reads
 * the zone under the pointer from the same zoning data the Map Viewer uses.
 */
export function LandingHero({ go, barangayCount, topCommercial, topSpecies, topRefo, restrictions }) {
  const [map, setMap] = useState(null);
  const [point, setPoint] = useState(null);
  const svgRef = useRef(null);
  const pathRefs = useRef({});

  useEffect(() => { loadZoningMap().then(setMap); }, []);

  const total = map ? map.classes.reduce((s, c) => s + c.ha, 0) : 0;

  function readZone(e) {
    const svg = svgRef.current;
    if (!svg || !map) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    // Smallest classes first, so a small zone drawn over a large one wins
    const hit = [...map.classes].reverse().find(c => pathRefs.current[c.id]?.isPointInFill(p));
    setPoint(hit ? { x: p.x, y: p.y, zone: hit } : null);
  }

  return (
    <section className="lh" aria-labelledby="lh-title">
      <style>{LH_CSS}</style>

      <div className="lh-sheet">
        <figure className="lh-map">
          {map ? (
            <svg ref={svgRef} viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="xMidYMid meet"
              role="img" aria-label={`Zoning map of Panabo City: ${map.classes.length} zones over ${ha(total)}`}
              onPointerMove={readZone} onPointerDown={readZone} onPointerLeave={() => setPoint(null)}>
              <path d={map.outline} className="lh-land"/>
              {map.classes.map(c => (
                <path key={c.id} ref={el => { pathRefs.current[c.id] = el; }} d={c.path} fill={HEX[c.id] ?? '#888'} fillRule="evenodd"
                  className={point && point.zone.id !== c.id ? 'lh-zone dim' : 'lh-zone'}/>
              ))}
              <path d={map.outline} className="lh-lines"/>
              {point && <circle cx={point.x} cy={point.y} r="7" className="lh-dot"/>}
            </svg>
          ) : <div className="lh-map-wait" aria-hidden="true"/>}
          <figcaption>Integrated Zoning Map of Panabo City, 2020–2029</figcaption>
        </figure>

        <div className="lh-block">
          <h1 id="lh-title">Panabo's zoning, now a live map</h1>
          <p className="lh-lead">
            TerraSpec is a decision-support system for Panabo City. It scores land suitability for each of
            the city's {barangayCount} barangays, answers zoning questions in plain language, and matches native
            trees to reforestation sites.
          </p>

          <div className="lh-readout" aria-live="polite">
            {point ? (
              <>
                <span className="lh-sw" style={{ background: HEX[point.zone.id] }}/>
                <span><strong>{LABEL[point.zone.id] ?? point.zone.name}</strong> · {ha(point.zone.ha)} across the city</span>
              </>
            ) : (
              <span>{map ? `Point at the map to read a zone: ${map.classes.length} zones, ${ha(total)}.` : 'Loading the zoning map…'}</span>
            )}
          </div>

          <dl className="lh-facts">
            {topCommercial && (
              <div><dt>Best barangay for commercial use</dt><dd>{topCommercial.unit_name}, {topCommercial.scores.commercial.pct}%</dd></div>
            )}
            {topSpecies && topRefo && (
              <div><dt>Top native species for {topRefo.unit_name}</dt><dd>{topSpecies.common_name}, {topSpecies.score_pct}% match</dd></div>
            )}
            {restrictions.length > 0 && (
              <div><dt>Environmental restrictions</dt><dd>{restrictions.length}, including {restrictions[0].name}</dd></div>
            )}
          </dl>

          <div className="lh-actions">
            <button type="button" className="lh-btn" onClick={() => go('dashboard')}>Open the system</button>
            <a href="#zoning" className="lh-link">See the zoning, layer by layer</a>
          </div>
          <p className="lh-credit">Built at Davao del Norte State College, 2026</p>
        </div>
      </div>
    </section>
  );
}

const LH_CSS = `
  .lh { position: relative; background: #fff; padding: 48px 32px 64px; min-height: calc(100svh - 64px); display: grid; place-items: center; overflow: hidden; }
  .lh-sheet {
    width: min(1180px, 100%); background: hsl(150 6% 94%); color: hsl(240 10% 8%);
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 440px); gap: 40px; padding: 32px;
  }
  .lh-map { margin: 0; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
  .lh-map svg, .lh-map-wait { width: 100%; height: min(68svh, 640px); display: block; background: hsl(160 14% 90%); cursor: crosshair; touch-action: pan-y; }
  .lh-map-wait { animation: lh-pulse 1.4s ease-in-out infinite; }
  @keyframes lh-pulse { 50% { opacity: .6; } }
  .lh-map figcaption { font-size: 13px; color: hsl(240 6% 35%); }
  .lh-land { fill: hsl(150 8% 82%); }
  .lh-zone { transition: opacity .15s; }
  .lh-zone.dim { opacity: .28; }
  .lh-lines { fill: none; stroke: #fff; stroke-width: 0.8; vector-effect: non-scaling-stroke; }
  .lh-dot { fill: hsl(240 10% 8%); stroke: #fff; stroke-width: 2.5; vector-effect: non-scaling-stroke; pointer-events: none; }

  .lh-block { display: flex; flex-direction: column; min-width: 0; }
  .lh-block h1 { font-family: 'Fraunces', serif; font-weight: 400; font-size: clamp(40px, 4.2vw, 60px); line-height: 1; letter-spacing: -0.03em; margin: 0; }
  .lh-lead { font-size: 17px; line-height: 1.55; margin: 20px 0 0; }
  .lh-readout {
    margin-top: 24px; padding: 14px 16px; background: hsl(60 6% 89%); font-size: 15px; line-height: 1.45;
    display: flex; align-items: center; gap: 10px; min-height: 52px;
  }
  .lh-sw { width: 14px; height: 14px; flex: none; }
  .lh-facts { margin: 20px 0 0; display: grid; gap: 12px; }
  .lh-facts dt { font-size: 13px; color: hsl(240 6% 35%); }
  .lh-facts dd { margin: 2px 0 0; font-size: 16px; font-weight: 500; }
  .lh-actions { margin-top: auto; padding-top: 28px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
  .lh-btn {
    height: 48px; padding: 0 22px; border: none; border-radius: 0; background: hsl(162 47% 26%); color: #fff;
    font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: background-color .15s, transform .1s;
  }
  .lh-btn:hover { background: hsl(162 47% 20%); }
  .lh-btn:active { transform: translateY(1px); }
  .lh-btn:focus-visible, .lh-link:focus-visible { outline: 2px solid hsl(162 47% 26%); outline-offset: 3px; }
  .lh-link { font-size: 15px; color: hsl(240 10% 8%); text-decoration: underline; text-underline-offset: 4px; }
  .lh-link:hover { color: hsl(162 47% 24%); }
  .lh-credit { margin: 16px 0 0; font-size: 13px; color: hsl(240 6% 35%); }

  @media (max-width: 900px) {
    .lh { padding: 16px 16px 32px; min-height: auto; }
    .lh-sheet { grid-template-columns: 1fr; gap: 24px; padding: 20px; }
    .lh-map svg, .lh-map-wait { height: 52svh; }
    .lh-block h1 { font-size: clamp(34px, 9vw, 44px); }
    /* On a phone the title and lead come first, then the map, then what it reads */
    .lh-block { display: contents; }
    .lh-block h1 { order: 1; }
    .lh-lead { order: 2; margin-top: -8px; }
    .lh-map { order: 3; }
    .lh-readout { order: 4; margin-top: 0; }
    .lh-facts { order: 5; margin-top: 0; }
    .lh-actions { order: 6; padding-top: 4px; }
    .lh-credit { order: 7; margin-top: -8px; }
    .lh-map svg, .lh-map-wait { height: 46svh; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lh-map-wait { animation: none; }
    .lh-zone, .lh-btn { transition: none; }
  }
`;
