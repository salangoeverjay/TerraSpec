import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Map, MapControls, MapMarker, MarkerContent,
  MapPopup, MarkerTooltip, useMap,
} from '../../components/ui/map';
import { PANABO, BARANGAY_COORDS, ZONING_LEGEND, fetchSuitabilitySummary, findBarangayAt, normalizeName } from './data.js';
import { Icon, Btn, Card, CardHeader, CardBody, Badge, Inp, ScoreRing } from './components.jsx';

function MapChatBubble({ parcel, selectedPoint, nearestBarangay, rightOffset }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ask me about the map — parcels, zoning, flood risk, or reforestation.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const b = parcel?.barangay ?? nearestBarangay;

  const bubblePrompts = useMemo(() => {
    const lastMsg = messages.filter(m => m.role === 'assistant').at(-1)?.content ?? '';
    const talked  = messages.length > 1;

    const isRefo  = /reforest|tree|species|mangrove|bakawan|molave|toog|nipa/i.test(lastMsg);
    const isEnv   = /flood|hazard|landslide|storm|restrict|protect|watershed/i.test(lastMsg);
    const isSuit  = /suitabilit|score|suitable|commercial|residential|industrial/i.test(lastMsg);

    if (!talked) {
      return b ? [
        `What is the suitability of ${b}?`,
        `Are there flood risks in ${b}?`,
        `Best tree species for ${b}?`,
        `What zone is ${b} under?`,
      ] : [
        'Which areas have high flood risk?',
        'Where are the mangrove protection zones?',
        'Top commercial zones in Panabo City',
        'Best reforestation sites in Panabo',
      ];
    }

    if (b) {
      if (isRefo) return [`What species are best for ${b}?`, `Watershed restrictions in ${b}?`, `Elevation of ${b}?`, 'Other reforestation zones'];
      if (isEnv)  return [`Suitability score of ${b}?`, `What development is allowed in ${b}?`, 'Which zones have similar risks?', `Reforestation options for ${b}?`];
      if (isSuit) return [`Flood risks in ${b}?`, `Restrictions in ${b}?`, `Best tree species for ${b}?`, `Compare ${b} with nearby zones`];
      return [`Commercial suitability of ${b}?`, `Environmental risks in ${b}?`, `Zone classification of ${b}?`, `Reforestation potential of ${b}?`];
    }

    if (isRefo) return ['Which barangays are in watershed zones?', 'Native trees best for coastal areas?', 'DENR priority reforestation sites?', 'Mangrove restoration areas in Panabo'];
    if (isEnv)  return ['Barangays with storm surge risk?', 'Where are all protected areas?', 'Zones with landslide exposure?', 'Show all SAFDZ areas'];
    if (isSuit) return ['Top commercial zones in Panabo City', 'Best barangays for residential use?', 'Zones with lowest flood risk?', 'Compare urban vs rural suitability'];
    return ['Which areas have the highest flood risk?', 'Where are the protected mangrove zones?', 'Top commercial zones in Panabo', 'Reforestation potential here?'];
  }, [b, messages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    setMessages(m => [...m, { role: 'user', content: text }, { role: 'assistant', content: 'Thinking...' }]);

    const selection = parcel
      ? `Parcel ${parcel.id}, ${parcel.barangay}, zone ${parcel.zone}. Area: ${parcel.area} sqm. Soil: ${parcel.soil}. Slope: ${parcel.slope}. Flood: ${parcel.flood}. Road: ${parcel.road_m}m. Suitability: ${parcel.score}%.`
      : nearestBarangay && selectedPoint
      ? `Barangay ${nearestBarangay}. Map point at ${selectedPoint.coords[1].toFixed(4)}°N, ${selectedPoint.coords[0].toFixed(4)}°E.${selectedPoint.zoning ? ` Zoning: ${selectedPoint.zoning.label}.` : ''}${selectedPoint.scores ? ` Suitability: ${Object.entries(USE_LABELS).filter(([k]) => selectedPoint.scores[k]).map(([k, l]) => `${l} ${selectedPoint.scores[k].pct}%`).join(', ')}.` : ''}`.slice(0, 255)
      : nearestBarangay
      ? `Barangay ${nearestBarangay}, Panabo City.`
      : 'Panabo City map view';

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, context: { selection } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Error');
      setMessages(m => m.filter(x => x.content !== 'Thinking...').concat({ role: 'assistant', content: data.answer || 'No response.' }));
    } catch {
      setMessages(m => m.filter(x => x.content !== 'Thinking...').concat({ role: 'assistant', content: 'Could not reach the AI. Try again.' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'absolute', bottom: 16, right: rightOffset, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, transition: 'right 0.25s ease' }}>
      {open && (
        <Card style={{ width: 340, height: 400, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bot" size={14} style={{ color: 'white' }}/>
              </div>
              {/* Layers panel – left; anchored from bottom so legends stay visible */}
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 4, borderRadius: 5, display: 'flex' }}>
              <Icon name="x" size={14}/>
            </button>
          </div>

          {(parcel || nearestBarangay) && (
            <div style={{ padding: '5px 14px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--brand) / 0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="pin" size={11} style={{ color: 'hsl(var(--brand))' }}/>
              <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Viewing:</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {parcel ? `${parcel.id} · ${parcel.barangay}` : nearestBarangay}
              </span>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6, alignItems: 'flex-start' }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'hsl(var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Icon name="bot" size={12} style={{ color: 'white' }}/>
                  </div>
                )}
                <div style={{
                  maxWidth: '82%', padding: '7px 11px',
                  borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                  background: m.role === 'user' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  color: m.role === 'user' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                  fontSize: 12.5, lineHeight: 1.5,
                }}>
                  {m.content === 'Thinking...' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0' }}>
                      {[0, 180, 360].map(d => (
                        <span key={d} style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: 'hsl(var(--brand))',
                          display: 'inline-block',
                          animation: `bounce 1.5s ${d}ms ease-in-out infinite`,
                        }}/>
                      ))}
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>

          {/* Dynamic quick prompts */}
          <div style={{ padding: '5px 8px', borderTop: '1px solid hsl(var(--border) / 0.5)', display: 'flex', gap: 4, overflowX: 'auto', flexWrap: 'nowrap' }}>
            {bubblePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => { if (!loading) { setInput(p); } }}
                disabled={loading}
                style={{
                  flexShrink: 0, fontSize: 10.5, padding: '3px 9px',
                  borderRadius: 6, border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))',
                  cursor: loading ? 'default' : 'pointer', whiteSpace: 'nowrap',
                  opacity: loading ? 0.5 : 1,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'hsl(var(--brand))'; e.currentTarget.style.background = 'hsl(var(--brand) / 0.06)'; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.background = 'hsl(var(--muted))'; }}
              >{p}</button>
            ))}
          </div>

          <div style={{ padding: '8px 10px', borderTop: '1px solid hsl(var(--border))', display: 'flex', gap: 6 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void send(); } }}
              placeholder={
                parcel          ? `Ask about ${parcel.barangay}…` :
                nearestBarangay ? `Ask about ${nearestBarangay}…` :
                'Ask about this location…'
              }
              className="input"
              style={{ flex: 1, height: 36, fontSize: 12.5, padding: '0 10px' }}
            />
            <Btn variant="brand" sz="sm" icon="send" disabled={loading || !input.trim()} onClick={send}/>
          </div>
        </Card>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 48, height: 48, borderRadius: '50%',
          background: open ? 'hsl(var(--foreground))' : 'hsl(var(--brand))',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'background 0.15s, transform 0.15s',
          color: 'white',
        }}
        title={open ? 'Close AI Chat' : 'Ask AI about the map'}
      >
        <Icon name={open ? 'x' : 'messageSquare'} size={20}/>
      </button>
    </div>
  );
}

// Reforestation suitability per barangay (stored AHP-WLC results) on the PSA barangay boundaries
const REFO_LEGEND = [
  { label: 'Highly Suitable',     hex: '#15803d' },
  { label: 'Moderately Suitable', hex: '#86efac' },
];

function ReforestationLayer({ visible, hiddenRefoZones }) {
  const ctx = useMap();
  useMemo(() => {
    if (!ctx?.map) return;
    let mounted = true;
    const map = ctx.map;
    Promise.all([
      fetch('/data/panabo_barangays.geojson').then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
      fetchSuitabilitySummary(),
    ])
      .then(([boundaries, summary]) => {
        if (!mounted) return;
        const byName = Object.fromEntries(summary.map(z => [normalizeName(z.unit_name), z]));
        const features = boundaries.features
          .map(f => {
            const zone = byName[normalizeName(f.properties.name)];
            const result = zone?.scores?.reforestation;
            return result && REFO_LEGEND.some(l => l.label === result.level)
              ? { ...f, properties: { name: zone.unit_name, level: result.level, pct: result.pct } }
              : null;
          })
          .filter(Boolean);
        const data = { type: 'FeatureCollection', features };
        try {
          if (map.getSource('reforestation-zones')) { map.getSource('reforestation-zones').setData(data); return; }
          map.addSource('reforestation-zones', { type: 'geojson', data });
          const color = ['match', ['get', 'level'], ...REFO_LEGEND.flatMap(l => [l.label, l.hex]), '#888888'];
          map.addLayer({ id: 'reforestation-fill', type: 'fill', source: 'reforestation-zones',
            layout: { visibility: 'none' }, paint: { 'fill-color': color, 'fill-opacity': 0.4 } });
          map.addLayer({ id: 'reforestation-line', type: 'line', source: 'reforestation-zones',
            layout: { visibility: 'none' }, paint: { 'line-color': '#14532d', 'line-width': 1.5, 'line-opacity': 0.9, 'line-dasharray': [4, 3] } });
        } catch (e) { console.warn('ReforestationLayer error', e); }
      })
      .catch(e => console.warn('ReforestationLayer data error', e));
    return () => { mounted = false; };
  }, [ctx]);

  useMemo(() => {
    if (!ctx?.map) return;
    const vis = visible ? 'visible' : 'none';
    try {
      if (ctx.map.getLayer('reforestation-fill')) ctx.map.setLayoutProperty('reforestation-fill', 'visibility', vis);
      if (ctx.map.getLayer('reforestation-line')) ctx.map.setLayoutProperty('reforestation-line', 'visibility', vis);
    } catch { /* ignore */ }
  }, [ctx, visible]);

  useMemo(() => {
    if (!ctx?.map) return;
    const shown = REFO_LEGEND.map(l => l.label).filter(l => !hiddenRefoZones.has(l));
    const filter = shown.length === REFO_LEGEND.length ? null : ['in', ['get', 'level'], ['literal', shown]];
    try {
      if (ctx.map.getLayer('reforestation-fill')) ctx.map.setFilter('reforestation-fill', filter);
      if (ctx.map.getLayer('reforestation-line')) ctx.map.setFilter('reforestation-line', filter);
    } catch { /* ignore */ }
  }, [ctx, hiddenRefoZones]);

  return null;
}

const LANDSLIDE_LEGEND = [
  { label: 'High',     hex: '#16a34a', val: 'High'     },
  { label: 'Moderate', hex: '#f59e0b', val: 'Moderate' },
];

const ZONING_COLOR = ['match', ['get', 'zone'], ...ZONING_LEGEND.flatMap(z => [z.id, z.hex]), '#888888'];

// Raster basemaps drawn under the TerraSpec layers. "carto" shows the default vector style only.
const BASEMAPS = {
  osm: {
    label: 'Street',
    title: 'OpenStreetMap',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors',
    maxzoom: 19,
  },
  satellite: {
    label: 'Satellite',
    title: 'Esri World Imagery',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    maxzoom: 19,
  },
  carto: { label: 'Light', title: 'CARTO light / dark (follows the app theme)' },
};

const TERRASPEC_LAYERS = ['zoning-fill', 'zoning-line', 'reforestation-fill', 'reforestation-line', 'landslide-fill', 'landslide-line', 'flood-fill', 'flood-line'];

function BasemapLayer({ basemap }) {
  const ctx = useMap();
  useMemo(() => {
    if (!ctx?.map) return;
    const map = ctx.map;
    const apply = () => {
      try {
        const below = TERRASPEC_LAYERS.find(id => map.getLayer(id));
        for (const [key, def] of Object.entries(BASEMAPS)) {
          if (!def.tiles) continue;
          const id = `basemap-${key}`;
          if (!map.getSource(id)) {
            map.addSource(id, { type: 'raster', tiles: def.tiles, tileSize: 256, maxzoom: def.maxzoom, attribution: def.attribution });
            map.addLayer({ id, type: 'raster', source: id, layout: { visibility: 'none' } }, below);
          }
          map.setLayoutProperty(id, 'visibility', key === basemap ? 'visible' : 'none');
        }
      } catch (e) { console.warn('BasemapLayer error', e); }
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [ctx, basemap]);
  return null;
}

function ZoningLayer({ visible, hiddenZones }) {
  const ctx = useMap();
  useMemo(() => {
    if (!ctx?.map) return;
    let mounted = true;
    const map = ctx.map;
    fetch('/data/zoning_2020.geojson')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        if (!mounted) return;
        try {
          if (map.getSource('zoning')) { map.getSource('zoning').setData(data); return; }
          map.addSource('zoning', { type: 'geojson', data });
          map.addLayer({ id: 'zoning-fill', type: 'fill', source: 'zoning',
            paint: { 'fill-color': ZONING_COLOR, 'fill-opacity': 0.45 } });
          map.addLayer({ id: 'zoning-line', type: 'line', source: 'zoning',
            paint: { 'line-color': ZONING_COLOR, 'line-width': 0.6, 'line-opacity': 0.9 } });
        } catch (e) { console.warn('ZoningLayer error', e); }
      })
      .catch(e => console.warn('ZoningLayer data error', e));
    return () => { mounted = false; };
  }, [ctx]);

  useMemo(() => {
    if (!ctx?.map) return;
    const vis = visible ? 'visible' : 'none';
    try {
      if (ctx.map.getLayer('zoning-fill')) ctx.map.setLayoutProperty('zoning-fill', 'visibility', vis);
      if (ctx.map.getLayer('zoning-line')) ctx.map.setLayoutProperty('zoning-line', 'visibility', vis);
    } catch { /* ignore */ }
  }, [ctx, visible]);

  useMemo(() => {
    if (!ctx?.map) return;
    const shown = ZONING_LEGEND.map(z => z.id).filter(id => !hiddenZones.has(id));
    const filter = shown.length === ZONING_LEGEND.length ? null : ['in', ['get', 'zone'], ['literal', shown]];
    try {
      if (ctx.map.getLayer('zoning-fill')) ctx.map.setFilter('zoning-fill', filter);
      if (ctx.map.getLayer('zoning-line')) ctx.map.setFilter('zoning-line', filter);
    } catch { /* ignore */ }
  }, [ctx, hiddenZones]);

  return null;
}

function LandslideLayer({ visible, hiddenLandslide }) {
  const ctx = useMap();
  useMemo(() => {
    if (!ctx?.map) return;
    let mounted = true;
    const map = ctx.map;
      fetch('/data/landslide_hazard_2020.geojson')
        .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
        .then(data => {
          if (!mounted) return;
          try {
            if (map.getSource('landslide-hazard')) { map.getSource('landslide-hazard').setData(data); return; }
            map.addSource('landslide-hazard', { type: 'geojson', data });
            map.addLayer({ id: 'landslide-fill', type: 'fill', source: 'landslide-hazard',
              paint: { 'fill-color': ['match', ['get', 'hazard'], 'High', '#16a34a', 'Moderate', '#f59e0b', '#888'], 'fill-opacity': 0.65 } });
            map.addLayer({ id: 'landslide-line', type: 'line', source: 'landslide-hazard',
              paint: { 'line-color': ['match', ['get', 'hazard'], 'High', '#136c2e', 'Moderate', '#b45309', '#444'], 'line-width': 2.5 } });
          } catch (e) { console.warn('LandslideLayer error', e); }
        })
        .catch(e => console.warn('LandslideLayer data error', e));
    return () => { mounted = false; };
  }, [ctx]);

  useMemo(() => {
    if (!ctx?.map) return;
    const vis = visible ? 'visible' : 'none';
    try {
      if (ctx.map.getLayer('landslide-fill')) ctx.map.setLayoutProperty('landslide-fill', 'visibility', vis);
      if (ctx.map.getLayer('landslide-line')) ctx.map.setLayoutProperty('landslide-line', 'visibility', vis);
    } catch { /* ignore */ }
  }, [ctx, visible]);

  useMemo(() => {
    if (!ctx?.map) return;
    const hiddenVals = LANDSLIDE_LEGEND.filter(l => hiddenLandslide.has(l.label)).map(l => l.val);
    const shown = LANDSLIDE_LEGEND.map(l => l.val).filter(v => !hiddenVals.includes(v));
    const filter = shown.length === LANDSLIDE_LEGEND.length ? null : ['in', ['get', 'hazard'], ['literal', shown]];
    try {
      if (ctx.map.getLayer('landslide-fill')) ctx.map.setFilter('landslide-fill', filter);
      if (ctx.map.getLayer('landslide-line')) ctx.map.setFilter('landslide-line', filter);
    } catch { /* ignore */ }
  }, [ctx, hiddenLandslide]);

  return null;
}

function FloodLayer({ visible, hiddenFlood }) {
  const ctx = useMap();
  const FLOOD_LEVELS = ['Very High', 'High', 'Moderate'];
  useMemo(() => {
    if (!ctx?.map) return;
    let mounted = true;
    const map = ctx.map;
    fetch('/data/flood_hazard_2020.geojson')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        if (!mounted) return;
        try {
          if (map.getSource('flood-zones')) { map.getSource('flood-zones').setData(data); return; }
          map.addSource('flood-zones', { type: 'geojson', data });
          map.addLayer({ id: 'flood-fill', type: 'fill', source: 'flood-zones',
            paint: { 'fill-color': ['match', ['get', 'hazard'], 'Very High', '#341648', 'High', '#6b3e81', 'Moderate', '#c074f2', '#888'], 'fill-opacity': 0.35 } });
          map.addLayer({ id: 'flood-line', type: 'line', source: 'flood-zones',
            paint: { 'line-color': ['match', ['get', 'hazard'], 'Very High', '#200f2c', 'High', '#4a2860', 'Moderate', '#9050c9', '#444'], 'line-width': 1.5, 'line-opacity': 0.8 } });
        } catch (e) { console.warn('FloodLayer error', e); }
      })
      .catch(e => console.warn('FloodLayer data error', e));
    return () => { mounted = false; };
  }, [ctx]);

  useMemo(() => {
    if (!ctx?.map) return;
    const vis = visible ? 'visible' : 'none';
    try {
      if (ctx.map.getLayer('flood-fill')) ctx.map.setLayoutProperty('flood-fill', 'visibility', vis);
      if (ctx.map.getLayer('flood-line')) ctx.map.setLayoutProperty('flood-line', 'visibility', vis);
    } catch { /* ignore */ }
  }, [ctx, visible]);

  useMemo(() => {
    if (!ctx?.map) return;
    const shown = FLOOD_LEVELS.filter(l => !hiddenFlood.has(l));
    const filter = shown.length === FLOOD_LEVELS.length ? null : ['in', ['get', 'hazard'], ['literal', shown]];
    try {
      if (ctx.map.getLayer('flood-fill')) ctx.map.setFilter('flood-fill', filter);
      if (ctx.map.getLayer('flood-line')) ctx.map.setFilter('flood-line', filter);
    } catch { /* ignore */ }
  }, [ctx, hiddenFlood]);

  return null;
}

const LEVEL_COLOR = { 'Highly Suitable': '#16a34a', 'Moderately Suitable': '#f59e0b', 'Low Suitability': '#ef4444' };

function FlyToHighlight({ zones }) {
  const ctx = useMap();
  const done = useRef(false);
  useMemo(() => {
    if (!ctx?.map || done.current || !zones.length) return;
    const coords = zones.map(z => BARANGAY_COORDS[z.unit_name]).filter(Boolean);
    if (!coords.length) return;
    done.current = true;
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    ctx.map.fitBounds(
      [[Math.min(...lngs) - 0.02, Math.min(...lats) - 0.02], [Math.max(...lngs) + 0.02, Math.max(...lats) + 0.02]],
      { padding: 80, duration: 1200, maxZoom: 14 },
    );
  }, [ctx, zones]);
  return null;
}

const USE_LABELS = {
  commercial: 'Commercial', residential: 'Residential', industrial: 'Industrial',
  agricultural: 'Agricultural', reforestation: 'Reforestation',
};

// Chat context for a barangay: real zoning class (if a point was clicked) and stored suitability results.
function buildMapContext(barangay, zoning, summary) {
  const scores = summary.find(z => z.unit_name === barangay)?.scores ?? null;
  const parts = scores
    ? Object.entries(USE_LABELS).filter(([k]) => scores[k]).map(([k, l]) => `${l} ${scores[k].pct}% (${scores[k].level})`)
    : [];
  return {
    barangay,
    zone: zoning?.label ?? null,
    score: null,
    scores,
    selection: [
      `Barangay ${barangay}`,
      zoning ? `zoning ${zoning.label}` : null,
      parts.length ? `suitability: ${parts.join(', ')}` : null,
    ].filter(Boolean).join('; ').slice(0, 255),
  };
}

export function MapScreen({ go, initial, barangay, search, setSearch, highlightZones = [], setMapContext }) {
  const mapRef = useRef(null);

  // Opened from a barangay profile ("Show on map"): fly to that barangay
  useEffect(() => {
    const coords = barangay ? BARANGAY_COORDS[barangay] : null;
    if (!coords) return;
    const timer = setTimeout(() => mapRef.current?.flyTo({ center: coords, zoom: 14, duration: 1000 }), 600);
    return () => clearTimeout(timer);
  }, [barangay]);
  const [selected, setSelected] = useState(initial?.parcel || null);

  const [summary, setSummary] = useState([]);
  useEffect(() => {
    fetchSuitabilitySummary().then(setSummary).catch(e => console.warn('Suitability summary error', e));
  }, []);

  // When a barangay is selected (e.g. from a dashboard link), sync to app-level chat context
  useEffect(() => {
    if (!setMapContext || !selected) return;
    setMapContext(buildMapContext(selected, null, summary));
  }, [selected, setMapContext, summary]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { setShowSearch(!!search); }, [search]);
  const [layers, setLayers] = useState({ zoning: true, reforestation: false, landslide: true, flood: true });
  const [basemap, setBasemap] = useState(() => {
    try { return localStorage.getItem('terraspec-basemap') || 'osm'; } catch { return 'osm'; }
  });
  function chooseBasemap(key) {
    setBasemap(key);
    try { localStorage.setItem('terraspec-basemap', key); } catch {}
  }
  const [hiddenZones, setHiddenZones] = useState(new Set());
  function toggleZone(id) { setHiddenZones(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const [hiddenRefoZones, setHiddenRefoZones] = useState(new Set());
  function toggleRefoZone(name) { setHiddenRefoZones(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; }); }
  const [hiddenLandslide, setHiddenLandslide] = useState(new Set());
  function toggleLandslide(label) { setHiddenLandslide(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; }); }
  const [hiddenFlood, setHiddenFlood] = useState(new Set());
  function toggleFlood(level) { setHiddenFlood(prev => { const n = new Set(prev); n.has(level) ? n.delete(level) : n.add(level); return n; }); }
  const [selectedPoint, setSelectedPoint]     = useState(null);
  const [nearestBarangay, setNearestBarangay] = useState(null);

  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  function MapClickHandler() {
    const ctx = useMap();
    useMemo(() => {
      if (!ctx?.map) return;
      const handler = async e => {
        const [lng, lat] = [e.lngLat?.lng ?? 0, e.lngLat?.lat ?? 0];

        // Zoning class under the click, from the rendered Integrated Zoning Map layer
        const zoningFeature = ctx.map.getLayer('zoning-fill')
          ? ctx.map.queryRenderedFeatures(e.point, { layers: ['zoning-fill'] })[0]
          : null;
        const zoning = zoningFeature ? ZONING_LEGEND.find(z => z.id === zoningFeature.properties.zone) ?? null : null;

        // Barangay containing the click (PSA boundaries)
        const barangay = await findBarangayAt(lng, lat).catch(() => null);
        const scores = summaryRef.current.find(z => z.unit_name === barangay)?.scores ?? null;

        setSelectedPoint({ coords: [lng, lat], barangay, zoning, scores });
        setNearestBarangay(barangay);
        if (setMapContext && barangay) {
          setMapContext(buildMapContext(barangay, zoning, summaryRef.current));
        }
      };
      ctx.map.on('click', handler);
      return () => ctx.map.off('click', handler);
    }, [ctx]);
    return null;
  }


  const parcel = PANABO.parcels.find(p => p.id === selected);
  const zoneInfo = ZONING_LEGEND.find(z => z.id === parcel?.zone);

  const { filteredParcels, filteredBarangays } = useMemo(() => {
    if (!search) return { filteredParcels: [], filteredBarangays: [] };
    const q = search.toLowerCase();
    const parcels = PANABO.parcels.filter(p =>
      p.id.toLowerCase().includes(q) || p.barangay.toLowerCase().includes(q)
    ).slice(0, 4);
    const barangays = PANABO.barangays.filter(b =>
      b.toLowerCase().includes(q) && BARANGAY_COORDS[b]
    ).slice(0, 4);
    return { filteredParcels: parcels, filteredBarangays: barangays };
  }, [search]);
  const hasResults = filteredParcels.length > 0 || filteredBarangays.length > 0;

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Map fills full area */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Map ref={mapRef} center={[125.6847, 7.307]} zoom={12.5} minZoom={10} maxZoom={18} className="h-full w-full">
          <MapControls showCompass showFullscreen position="top-right"/>
          <BasemapLayer basemap={basemap}/>
          <MapClickHandler/>
          <ZoningLayer visible={layers.zoning} hiddenZones={hiddenZones}/>
          <ReforestationLayer visible={layers.reforestation} hiddenRefoZones={hiddenRefoZones}/>
          <LandslideLayer visible={layers.landslide} hiddenLandslide={hiddenLandslide}/>
          <FloodLayer visible={layers.flood} hiddenFlood={hiddenFlood}/>
          {highlightZones.length > 0 && <FlyToHighlight zones={highlightZones}/>}
          {highlightZones.map((z, i) => {
            const coords = BARANGAY_COORDS[z.unit_name];
            if (!coords) return null;
            const color = LEVEL_COLOR[z.suitability_level] ?? '#6b7280';
            return (
              <MapMarker key={z.zone_unit_id} longitude={coords[0]} latitude={coords[1]}>
                <MarkerContent className="translate-y-[-12px]">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      background: color, color: 'white',
                      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      boxShadow: `0 2px 8px ${color}66`,
                      display: 'flex', alignItems: 'center', gap: 5,
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ opacity: 0.8, fontSize: 10 }}>#{i + 1}</span>
                      <span>{z.unit_name}</span>
                      <span style={{ opacity: 0.9 }}>{z.total_pct}%</span>
                    </div>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: color, border: '2.5px solid white',
                      boxShadow: `0 0 0 6px ${color}33`,
                    }}/>
                  </div>
                </MarkerContent>
                <MarkerTooltip>{z.unit_name} · {z.suitability_level} · {z.total_pct}%</MarkerTooltip>
              </MapMarker>
            );
          })}
          <MapMarker longitude={125.6847} latitude={7.307}>
            <MarkerContent className="translate-y-[-8px]">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ background: 'hsl(var(--brand))', color: 'white', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Panabo City</span>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'hsl(var(--brand))', border: '3px solid white', boxShadow: '0 0 0 8px hsl(162 47% 39% / 0.2)' }}/>
              </div>
            </MarkerContent>
            <MarkerTooltip>Panabo City, Davao del Norte</MarkerTooltip>
          </MapMarker>
          {selectedPoint && (
            <MapMarker longitude={selectedPoint.coords[0]} latitude={selectedPoint.coords[1]}>
              <MarkerContent>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', border: '2px solid hsl(var(--foreground))', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}/>
              </MarkerContent>
            </MapMarker>
          )}
          {/* Details open immediately at the clicked point */}
          {selectedPoint && (
            <MapPopup
              key={selectedPoint.coords.join(',')}
              longitude={selectedPoint.coords[0]}
              latitude={selectedPoint.coords[1]}
              closeButton
              onClose={() => setSelectedPoint(null)}
            >
                <div className="card" style={{ minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
                  <CardBody>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{selectedPoint.barangay ?? 'Outside Panabo City'}</div>
                    <div className="muted mono" style={{ fontSize: 11, marginBottom: 6 }}>{selectedPoint.coords[1].toFixed(5)}, {selectedPoint.coords[0].toFixed(5)}</div>
                    {selectedPoint.zoning && (
                      <div className="row" style={{ gap: 6, fontSize: 11.5, marginBottom: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: selectedPoint.zoning.hex, flexShrink: 0 }}/>
                        <span>Zoning: {selectedPoint.zoning.label}</span>
                      </div>
                    )}
                    {selectedPoint.scores ? (
                      <>
                        <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Barangay suitability (AHP-WLC)</div>
                        {Object.entries(USE_LABELS).filter(([k]) => selectedPoint.scores[k]).map(([k, label]) => (
                          <div key={k} className="row-between" style={{ fontSize: 11.5, gap: 10 }}>
                            <span>{label}</span>
                            <span className="mono" style={{ color: LEVEL_COLOR[selectedPoint.scores[k].level] ?? 'hsl(var(--muted-foreground))' }}>{selectedPoint.scores[k].pct}%</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="muted" style={{ fontSize: 11.5 }}>No suitability results for this location.</div>
                    )}
                    {selectedPoint.barangay && go && (
                      <button
                        onClick={() => go('barangays', { barangay: selectedPoint.barangay })}
                        style={{ marginTop: 8, width: '100%', fontSize: 11.5, padding: '4px 8px', borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--brand))', cursor: 'pointer', fontWeight: 600 }}
                      >
                        View barangay profile
                      </button>
                    )}
                  </CardBody>
                </div>
            </MapPopup>
          )}
        </Map>
      </div>

      {/* AI Recommendations banner */}
      {highlightZones.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, display: 'flex', alignItems: 'center', gap: 8,
          background: 'hsl(var(--card))', border: '1px solid hsl(var(--brand) / 0.4)',
          borderRadius: 12, padding: '8px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          fontSize: 12.5, whiteSpace: 'nowrap',
        }}>
          <Icon name="bot" size={13} style={{ color: 'hsl(var(--brand))' }}/>
          <span style={{ fontWeight: 600, color: 'hsl(var(--brand))' }}>AI Recommendations</span>
          <span className="muted">·</span>
          {highlightZones.map((z, i) => (
            <span key={z.zone_unit_id} style={{ fontWeight: 500 }}>
              {i > 0 && <span className="muted" style={{ marginRight: 4 }}>·</span>}
              {z.unit_name}
            </span>
          ))}
        </div>
      )}

      {/* Search results dropdown – fixed so it aligns with topbar search bar */}
      {showSearch && hasResults && (
        <div style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', width: 360, maxWidth: '50%', zIndex: 50 }}>
          <Card style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {filteredBarangays.length > 0 && (
                <>
                  <div style={{ padding: '6px 14px 3px', fontSize: 10.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Barangays</div>
                  {filteredBarangays.map(b => (
                    <div key={b} className="row" style={{ padding: '8px 14px', gap: 10, cursor: 'pointer' }}
                      onClick={() => {
                        const coords = BARANGAY_COORDS[b];
                        mapRef.current?.flyTo({ center: coords, zoom: 14, duration: 1000 });
                        setSearch(''); setShowSearch(false);
                      }}>
                      <Icon name="home" size={14} style={{ color: 'hsl(var(--brand))', flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{b}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>Panabo City</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {filteredParcels.length > 0 && (
                <>
                  <div style={{ padding: '6px 14px 3px', fontSize: 10.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: filteredBarangays.length > 0 ? '1px solid hsl(var(--border))' : 'none' }}>Parcels</div>
                  {filteredParcels.map(p => (
                    <div key={p.id} className="row" style={{ padding: '8px 14px', gap: 10, cursor: 'pointer' }}
                      onClick={() => { setSelected(p.id); setSearch(''); setShowSearch(false); }}>
                      <Icon name="pin" size={14} style={{ color: 'hsl(var(--brand))', flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.id}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{p.barangay} · {p.zone}</div>
                      </div>
                      <Badge variant={p.score >= 75 ? 'brand' : 'warn'}>{p.score}%</Badge>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Quick filter chips – bottom center of map */}
      <div style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 11 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Residential','Commercial','Mangrove','Flagged'].map(t => (
            <button key={t} className="chip" style={{ background: 'hsl(var(--background))', fontSize: 12 }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Layers panel – left; anchored from bottom so legends stay visible */}
      <div style={{ position: 'absolute', left: 16, bottom: 110, width: 210, zIndex: 10 }}>
        <Card style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}>
          <CardHeader style={{ padding: '10px 14px' }}>
            <div className="row" style={{ gap: 8 }}>
              <Icon name="layers" size={14}/>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Layers</span>
            </div>
          </CardHeader>
          <CardBody style={{ padding: '10px 14px', maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Basemap</div>
            <div className="row" style={{ gap: 4, marginBottom: 12 }}>
              {Object.entries(BASEMAPS).map(([key, def]) => (
                <button
                  key={key}
                  onClick={() => chooseBasemap(key)}
                  title={def.title}
                  style={{
                    flex: 1, fontSize: 11, padding: '4px 6px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid hsl(var(--border))',
                    background: basemap === key ? 'hsl(var(--brand))' : 'hsl(var(--background))',
                    color: basemap === key ? 'white' : 'hsl(var(--foreground))',
                    fontWeight: basemap === key ? 600 : 400,
                  }}
                >
                  {def.label}
                </button>
              ))}
            </div>
            <div className="stack" style={{ gap: 7, marginBottom: 12 }}>
              {[['zoning','Zoning ordinance'],['reforestation','Reforestation'],['landslide','Landslide Hazard'],['flood','Flood Hazard']].map(([k, label]) => (
                <label key={k} className="row" style={{ gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 12.5 }}>
                  <input type="checkbox" checked={layers[k]} onChange={e => setLayers(l => ({ ...l, [k]: e.target.checked }))} style={{ accentColor: 'hsl(var(--brand))' }}/>
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="separator"/>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '10px 0 7px' }}>Legend</div>
            <div className="stack" style={{ gap: 5 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Landslide Hazard <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· click to toggle</span></div>
              {LANDSLIDE_LEGEND.map(item => {
                const hidden = hiddenLandslide.has(item.label);
                return (
                  <div key={item.label} className="row" style={{ gap: 7, cursor: 'pointer', userSelect: 'none', opacity: hidden ? 0.35 : 1, transition: 'opacity .15s' }} onClick={() => toggleLandslide(item.label)} title={hidden ? `Show ${item.label}` : `Hide ${item.label}`}>
                    <span style={{ width: 12, height: 9, borderRadius: 2, background: item.hex, opacity: 0.85, flexShrink: 0, filter: hidden ? 'grayscale(1)' : 'none', transition: 'filter .15s' }}/>
                    <span style={{ fontSize: 11.5, textDecoration: hidden ? 'line-through' : 'none' }}>{item.label}</span>
                  </div>
                );
              })}
              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6, marginBottom: 2 }}>Flood Hazard <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· click to toggle</span></div>
              {[
                { label: 'Very High', hex: '#341648' },
                { label: 'High',      hex: '#6b3e81' },
                { label: 'Moderate',  hex: '#c074f2' },
              ].map(item => {
                const hidden = hiddenFlood.has(item.label);
                return (
                  <div key={item.label} className="row" style={{ gap: 7, cursor: 'pointer', userSelect: 'none', opacity: hidden ? 0.35 : 1, transition: 'opacity .15s' }} onClick={() => toggleFlood(item.label)} title={hidden ? `Show ${item.label}` : `Hide ${item.label}`}>
                    <span style={{ width: 12, height: 9, borderRadius: 2, background: item.hex, opacity: 0.85, flexShrink: 0, filter: hidden ? 'grayscale(1)' : 'none', transition: 'filter .15s' }}/>
                    <span style={{ fontSize: 11.5, textDecoration: hidden ? 'line-through' : 'none' }}>{item.label}</span>
                  </div>
                );
              })}
              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6, marginBottom: 2 }}>Zoning <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· click to toggle</span></div>
              {ZONING_LEGEND.map(z => {
                const hidden = hiddenZones.has(z.id);
                return (
                  <div key={z.id} className="row" style={{ gap: 7, cursor: 'pointer', userSelect: 'none', opacity: hidden ? 0.35 : 1, transition: 'opacity .15s' }} onClick={() => toggleZone(z.id)} title={hidden ? `Show ${z.id}` : `Hide ${z.id}`}>
                    <span style={{ width: 12, height: 9, borderRadius: 2, background: z.hex, flexShrink: 0, filter: hidden ? 'grayscale(1)' : 'none', transition: 'filter .15s' }}/>
                    <span style={{ fontSize: 11.5, textDecoration: hidden ? 'line-through' : 'none' }}>{z.label}</span>
                    <span className="muted mono" style={{ fontSize: 10, marginLeft: 'auto' }}>{z.id}</span>
                  </div>
                );
              })}
              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6, marginBottom: 2 }}>Reforestation <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· click to toggle</span></div>
              {REFO_LEGEND.map(item => {
                const hidden = hiddenRefoZones.has(item.label);
                const count = summary.filter(z => z.scores?.reforestation?.level === item.label).length;
                return (
                  <div key={item.label} className="row" style={{ gap: 7, cursor: 'pointer', userSelect: 'none', opacity: hidden ? 0.35 : 1, transition: 'opacity .15s' }} onClick={() => toggleRefoZone(item.label)} title={hidden ? `Show ${item.label}` : `Hide ${item.label}`}>
                    <span style={{ width: 12, height: 9, borderRadius: 2, background: item.hex, flexShrink: 0, filter: hidden ? 'grayscale(1)' : 'none', transition: 'filter .15s' }}/>
                    <span style={{ fontSize: 11.5, textDecoration: hidden ? 'line-through' : 'none' }}>{item.label}</span>
                    <span className="muted mono" style={{ fontSize: 10, marginLeft: 'auto' }}>{count} brgy</span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Parcel detail panel – right */}
      {parcel && (
        <div style={{ position: 'absolute', top: 16, right: 16, bottom: 16, width: 330, display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <Card style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.14)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: 7, marginBottom: 4 }}>
                    <span className="mono muted" style={{ fontSize: 11 }}>{parcel.code}</span>
                    {parcel.flag && <Badge variant="destructive">{parcel.flag}</Badge>}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{parcel.id}</h3>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{parcel.barangay}, Panabo City</div>
                </div>
                <Btn variant="ghost" sz="sm" icon="x" onClick={() => setSelected(null)}/>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 12 }}>
                <Btn variant="brand" sz="sm" icon="scale">Run analysis</Btn>
                <Btn variant="outline" sz="sm" icon="file">Report</Btn>
                <Btn variant="outline" sz="sm" icon="more"/>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <div className="row" style={{ gap: 18, marginBottom: 20 }}>
                <ScoreRing value={parcel.score} size={88}/>
                <div style={{ flex: 1 }}>
                  <div className="muted" style={{ fontSize: 11.5 }}>Overall MCDA score</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 4 }}>
                    {parcel.score >= 75 ? 'Highly suitable' : parcel.score >= 50 ? 'Moderately suitable' : 'Not suitable'}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                    {parcel.flag === 'mangrove' ? '⚠ Within Panabo Mangrove Park' : parcel.flag === 'protected' ? '⚠ Within Tibungol Watershed' : 'All ordinances satisfied'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Parcel attributes</div>
              <div style={{ marginBottom: 18 }}>
                {[
                  ['Zoning',         <span key="z"><span className="dot" style={{ background: zoneInfo?.hex, marginRight: 6 }}/>{zoneInfo?.name} ({parcel.zone})</span>],
                  ['Land area',      `${parcel.area.toLocaleString()} sqm`],
                  ['Coordinates',    <span key="c" className="mono">{parcel.lat}°, {parcel.lng}°</span>],
                  ['Soil type',      parcel.soil],
                  ['Slope',          parcel.slope],
                  ['Flood risk',     <Badge key="f" variant={parcel.flood === 'Low' ? 'brand' : parcel.flood === 'Med' ? 'warn' : 'destructive'}>{parcel.flood}</Badge>],
                  ['Road proximity', `${parcel.road_m} m`],
                ].map(([k, v], i) => (
                  <div key={k} className="row-between" style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid hsl(var(--border))' : 'none', fontSize: 12.5 }}>
                    <span className="muted">{k}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Permitted uses</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'hsl(var(--foreground))' }}>{zoneInfo?.allowed_use}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Scale indicator */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}>
        <Badge variant="outline" style={{ background: 'hsl(var(--background))' }}>
          <Icon name="info" size={11}/>&nbsp;Lat 7.3088° · Lng 125.6841° · 1:8,000
        </Badge>
      </div>

      {/* AI Chat bubble */}
      <MapChatBubble parcel={parcel} selectedPoint={selectedPoint} nearestBarangay={nearestBarangay} rightOffset={parcel ? 362 : 16}/>
    </div>
  );
}
