import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Map, MapControls, MapMarker, MarkerContent,
  MarkerPopup, MarkerTooltip, useMap,
} from '../../components/ui/map';
import { PANABO, BARANGAY_COORDS } from './data.js';
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
      ? `Barangay ${nearestBarangay}. Map point at ${selectedPoint.coords[1].toFixed(4)}°N, ${selectedPoint.coords[0].toFixed(4)}°E. Suitability: ${selectedPoint.score}%.`
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

const REFORESTATION_ZONES_DATA = {
  type: 'FeatureCollection',
  features: [
    { name: 'Kauswagan Reforestation Zone', box: [[125.578, 7.305], [125.592, 7.316]] },
    { name: 'Mabunao Reforestation Zone',   box: [[125.569, 7.250], [125.583, 7.262]] },
  ].map(({ name, box: [[w, s], [e, n]] }) => ({
    type: 'Feature',
    properties: { name },
    geometry: { type: 'Polygon', coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]] },
  })),
};

function ReforestationLayer({ visible, hiddenRefoZones }) {
  const ctx = useMap();
  useMemo(() => {
    if (!ctx?.map) return;
    const map = ctx.map;
    if (map.getSource('reforestation-zones')) return;
    try {
      map.addSource('reforestation-zones', { type: 'geojson', data: REFORESTATION_ZONES_DATA });
      map.addLayer({
        id: 'reforestation-fill', type: 'fill', source: 'reforestation-zones',
        paint: { 'fill-color': '#16a34a', 'fill-opacity': 0.28 },
      });
      map.addLayer({
        id: 'reforestation-line', type: 'line', source: 'reforestation-zones',
        paint: { 'line-color': '#15803d', 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [4, 3] },
      });
    } catch (e) { console.warn('ReforestationLayer error', e); }
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
    const allNames = REFORESTATION_ZONES_DATA.features.map(f => f.properties.name);
    const shown = allNames.filter(n => !hiddenRefoZones.has(n));
    const filter = shown.length === allNames.length ? null : ['in', ['get', 'name'], ['literal', shown]];
    try {
      if (ctx.map.getLayer('reforestation-fill')) ctx.map.setFilter('reforestation-fill', filter);
      if (ctx.map.getLayer('reforestation-line')) ctx.map.setFilter('reforestation-line', filter);
    } catch { /* ignore */ }
  }, [ctx, hiddenRefoZones]);

  return null;
}

const LANDSLIDE_LEGEND = [
  { label: 'High',     hex: '#16a34a', val: 'Green'  },
  { label: 'Moderate', hex: '#f59e0b', val: 'Yellow' },
];

const DUMMY_FLOOD_DATA = {
  type: 'FeatureCollection',
  features: [
    { level: 'Very High', box: [[125.607, 7.290], [125.628, 7.308]] },
    { level: 'Very High', box: [[125.625, 7.262], [125.647, 7.278]] },
    { level: 'High',      box: [[125.638, 7.308], [125.660, 7.328]] },
    { level: 'High',      box: [[125.660, 7.278], [125.683, 7.298]] },
    { level: 'Moderate',  box: [[125.667, 7.328], [125.690, 7.348]] },
    { level: 'Moderate',  box: [[125.688, 7.298], [125.712, 7.318]] },
  ].map(({ level, box: [[w, s], [e, n]] }) => ({
    type: 'Feature',
    properties: { hazard: level },
    geometry: { type: 'Polygon', coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]] },
  })),
};

// Fallback sample data for landslide hazard when the real file is not present
const DUMMY_LANDSLIDE_DATA = {
  type: 'FeatureCollection',
  features: [
    { box: [[125.66, 7.29], [125.68, 7.305]], hazard: 'Green' },
    { box: [[125.695, 7.30], [125.712, 7.317]], hazard: 'Yellow' },
  ].map(({ box: [[w, s], [e, n]], hazard }) => ({
    type: 'Feature',
    properties: { hazard },
    geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
  })),
};

const DUMMY_ZONES_DATA = {
  type: 'FeatureCollection',
  features: [
    // R-1 Residential
    { z: 'R-1', box: [[125.6780, 7.2970], [125.6940, 7.3120]] },
    { z: 'R-1', box: [[125.6820, 7.3120], [125.6970, 7.3250]] },
    { z: 'R-1', box: [[125.6620, 7.2990], [125.6800, 7.3210]] },
    { z: 'R-1', box: [[125.6820, 7.3240], [125.6990, 7.3410]] },
    { z: 'R-1', box: [[125.6890, 7.3380], [125.7060, 7.3570]] },
    // C-1 Commercial
    { z: 'C-1', box: [[125.6790, 7.3040], [125.6920, 7.3150]] },
    { z: 'C-1', box: [[125.7020, 7.2900], [125.7190, 7.3080]] },
    { z: 'C-1', box: [[125.7100, 7.3070], [125.7230, 7.3190]] },
    // I-1 Industrial
    { z: 'I-1', box: [[125.6780, 7.2820], [125.6970, 7.2990]] },
    { z: 'I-1', box: [[125.6490, 7.2730], [125.6710, 7.2930]] },
    { z: 'I-1', box: [[125.7060, 7.3150], [125.7240, 7.3360]] },
  ].map(({ z, box: [[w, s], [e, n]] }) => ({
    type: 'Feature',
    properties: { zone: z },
    geometry: { type: 'Polygon', coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]] },
  })),
};

function ZoningLayer({ visible, hiddenZones }) {
  const ctx = useMap();
  useMemo(() => {
    if (!ctx?.map) return;
    const map = ctx.map;
    if (map.getSource('zoning-dummy')) return;
    try {
      map.addSource('zoning-dummy', { type: 'geojson', data: DUMMY_ZONES_DATA });
      map.addLayer({
        id: 'zoning-fill', type: 'fill', source: 'zoning-dummy',
        paint: {
          'fill-color': ['match', ['get', 'zone'], 'R-1', '#f97316', 'C-1', '#3b82f6', 'I-1', '#7c3aed', '#888888'],
          'fill-opacity': 0.28,
        },
      });
      map.addLayer({
        id: 'zoning-line', type: 'line', source: 'zoning-dummy',
        paint: {
          'line-color': ['match', ['get', 'zone'], 'R-1', '#ea6d0a', 'C-1', '#1d4ed8', 'I-1', '#5b21b6', '#444444'],
          'line-width': 1.5,
          'line-opacity': 0.8,
        },
      });
    } catch (e) { console.warn('ZoningLayer error', e); }
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
    const shown = ['R-1', 'C-1', 'I-1'].filter(z => !hiddenZones.has(z));
    const filter = shown.length === 3 ? null : ['in', ['get', 'zone'], ['literal', shown]];
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
      fetch('/data/landslide_hazard_panabo_final.geojson')
        .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
        .catch(() => {
          // fallback to bundled sample data when the file is missing
          return DUMMY_LANDSLIDE_DATA;
        })
        .then(data => {
          if (!mounted) return;
          try {
            if (map.getSource('landslide-hazard')) { map.getSource('landslide-hazard').setData(data); return; }
            map.addSource('landslide-hazard', { type: 'geojson', data });
            map.addLayer({ id: 'landslide-fill', type: 'fill', source: 'landslide-hazard',
              paint: { 'fill-color': ['match', ['get', 'hazard'], 'Green', '#16a34a', 'Yellow', '#f59e0b', '#888'], 'fill-opacity': 0.65 } });
            map.addLayer({ id: 'landslide-line', type: 'line', source: 'landslide-hazard',
              paint: { 'line-color': ['match', ['get', 'hazard'], 'Green', '#136c2e', 'Yellow', '#b45309', '#444'], 'line-width': 2.5 } });
          } catch (e) { console.warn('LandslideLayer error', e); }
        });
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
    const map = ctx.map;
    if (map.getSource('flood-zones')) return;
    try {
      map.addSource('flood-zones', { type: 'geojson', data: DUMMY_FLOOD_DATA });
      map.addLayer({ id: 'flood-fill', type: 'fill', source: 'flood-zones',
        paint: { 'fill-color': ['match', ['get', 'hazard'], 'Very High', '#341648', 'High', '#6b3e81', 'Moderate', '#c074f2', '#888'], 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'flood-line', type: 'line', source: 'flood-zones',
        paint: { 'line-color': ['match', ['get', 'hazard'], 'Very High', '#200f2c', 'High', '#4a2860', 'Moderate', '#9050c9', '#444'], 'line-width': 1.5, 'line-opacity': 0.8 } });
    } catch (e) { console.warn('FloodLayer error', e); }
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

export function MapScreen({ initial, search, setSearch, highlightZones = [], setMapContext }) {
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(initial?.parcel || null);

  // When a parcel is selected from the right panel, sync to app-level chat context
  useEffect(() => {
    if (!setMapContext || !selected) return;
    const parcel  = PANABO.parcels.find(p => p.id === selected);
    const ranking = (PANABO.barangayRankings ?? []).find(r => r.barangay === (parcel?.barangay ?? selected));
    setMapContext({
      barangay: parcel?.barangay ?? selected,
      zone:     parcel?.zone     ?? ranking?.zone  ?? null,
      score:    parcel?.score    ?? ranking?.score ?? null,
    });
  }, [selected, setMapContext]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { setShowSearch(!!search); }, [search]);
  const [layers, setLayers] = useState({ zoning: true, reforestation: false, landslide: true, flood: true });
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

  const factorScores = useMemo(() => ({ soil: 0.8, water: 0.7, road: 0.6, slope: 0.9, flood: 0.95, landUse: 0.7 }), []);
  const weights = useMemo(() => ({ soil: 0.25, water: 0.2, road: 0.2, slope: 0.15, flood: 0.1, landUse: 0.1 }), []);

  function computeSuitabilityAt(coords) {
    const [lng, lat] = coords;
    const noise = (Math.sin(lng * 13 + lat * 7) + 1) * 0.05;
    const f = {
      soil:    Math.max(0, Math.min(1, factorScores.soil    + noise * 0.5)),
      water:   Math.max(0, Math.min(1, factorScores.water   + noise * 0.6)),
      road:    Math.max(0, Math.min(1, factorScores.road    + noise * 0.4)),
      slope:   Math.max(0, Math.min(1, factorScores.slope   - noise * 0.3)),
      flood:   Math.max(0, Math.min(1, factorScores.flood   - noise * 0.2)),
      landUse: Math.max(0, Math.min(1, factorScores.landUse + noise * 0.2)),
    };
    const w = weights;
    return Math.round((w.soil*f.soil + w.water*f.water + w.road*f.road + w.slope*f.slope + w.flood*f.flood + w.landUse*f.landUse) * 100);
  }

  function MapClickHandler() {
    const ctx = useMap();
    useMemo(() => {
      if (!ctx?.map) return;
      const handler = e => {
        const [lng, lat] = [e.lngLat?.lng ?? 0, e.lngLat?.lat ?? 0];
        setSelectedPoint({ coords: [lng, lat], score: computeSuitabilityAt([lng, lat]) });

        // Find nearest barangay and push to app-level context (powers the AI chat chip)
        if (setMapContext) {
          let nearest = null, minDist = Infinity;
          for (const [name, [bLng, bLat]] of Object.entries(BARANGAY_COORDS)) {
            const d = Math.hypot(lng - bLng, lat - bLat);
            if (d < minDist) { minDist = d; nearest = name; }
          }
          if (nearest) {
            const ranking = (PANABO.barangayRankings ?? []).find(r => r.barangay === nearest);
            setNearestBarangay(nearest);
            setMapContext({
              barangay: nearest,
              zone:     ranking?.zone  ?? null,
              score:    ranking?.score ?? null,
            });
          }
        }
      };
      ctx.map.on('click', handler);
      return () => ctx.map.off('click', handler);
    }, [ctx]);
    return null;
  }


  const parcel = PANABO.parcels.find(p => p.id === selected);
  const zoneInfo = PANABO.zones.find(z => z.id === parcel?.zone);

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
              <MarkerPopup>
                <div className="card" style={{ minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
                  <CardBody>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>Point Selection</div>
                    <div className="muted mono" style={{ fontSize: 11, marginBottom: 8 }}>{selectedPoint.coords[1].toFixed(5)}, {selectedPoint.coords[0].toFixed(5)}</div>
                    <ScoreRing value={selectedPoint.score} size={60}/>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Computed suitability</div>
                  </CardBody>
                </div>
              </MarkerPopup>
            </MapMarker>
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
              {[
                { id: 'R-1', label: 'General Residential', hex: '#f97316' },
                { id: 'C-1', label: 'Commercial',          hex: '#3b82f6' },
                { id: 'I-1', label: 'Industrial',          hex: '#7c3aed' },
              ].map(z => {
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
              {REFORESTATION_ZONES_DATA.features.map(f => {
                const name = f.properties.name;
                const hidden = hiddenRefoZones.has(name);
                return (
                  <div key={name} className="row" style={{ gap: 7, cursor: 'pointer', userSelect: 'none', opacity: hidden ? 0.35 : 1, transition: 'opacity .15s' }} onClick={() => toggleRefoZone(name)} title={hidden ? `Show ${name}` : `Hide ${name}`}>
                    <span style={{ width: 12, height: 9, borderRadius: 2, background: '#16a34a', flexShrink: 0, filter: hidden ? 'grayscale(1)' : 'none', transition: 'filter .15s' }}/>
                    <span style={{ fontSize: 11.5, textDecoration: hidden ? 'line-through' : 'none' }}>{name.replace(' Reforestation Zone', '')}</span>
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
