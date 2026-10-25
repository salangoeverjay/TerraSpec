import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Map, MapControls, MapMarker, MarkerContent,
  MapPopup, MarkerTooltip, useMap,
} from '../../components/ui/map';
import { PANABO, BARANGAY_COORDS, ZONING_LEGEND, fetchSuitabilitySummary, findBarangayAt } from './data.js';
import {
  ZoningLayer, FloodLayer, LandslideLayer, SuitabilityLayer, QueryBarangayLayer, BarangayLabelLayer, MangroveSitesLayer, MANGROVE_LEGEND,
  FLOOD_LEGEND, LANDSLIDE_LEGEND, SUITABILITY_LEGEND, SUITABILITY_USES, MAP_VIEWS, OVERLAY_LAYER_IDS, hatchSwatch,
} from './map-layers.jsx';
import { Icon, Btn, Card, CardHeader, CardBody, Badge, Inp, levelStyle } from './components.jsx';
import { ZoningQueryPanel, ZONING_QUERY_PRESETS, EMPTY_QUERY, runZoningQuery, barangayBounds } from './zoning-query.jsx';
import { AskTheMap } from './ask-the-map.jsx';

function MapChatBubble({ selectedPoint, nearestBarangay, rightOffset }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ask me about the map — zoning, flood risk, suitability or reforestation.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const b = nearestBarangay;

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

    const selection = nearestBarangay && selectedPoint
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
    } catch (err) {
      const reason = err instanceof Error && err.message !== 'Error' ? err.message : 'Could not reach the AI. Try again.';
      setMessages(m => m.filter(x => x.content !== 'Thinking...').concat({ role: 'assistant', content: reason }));
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

          {nearestBarangay && (
            <div style={{ padding: '5px 14px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--brand) / 0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="pin" size={11} style={{ color: 'hsl(var(--brand))' }}/>
              <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Viewing:</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {nearestBarangay}
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

function BasemapLayer({ basemap }) {
  const ctx = useMap();
  const map = ctx?.map;
  // Wait for the map to be ready (also after a light/dark style swap, which removes these layers)
  const ready = !!ctx?.isLoaded;
  useEffect(() => {
    if (!map || !ready) return;
    try {
      const below = OVERLAY_LAYER_IDS.find(id => map.getLayer(id));
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
  }, [map, ready, basemap]);
  return null;
}

const sectionLabel = { fontSize: 10.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 };

const chip = active => ({
  flex: '1 1 auto', fontSize: 11, padding: '4px 6px', borderRadius: 6, cursor: 'pointer',
  border: '1px solid hsl(var(--border))',
  background: active ? 'hsl(var(--brand))' : 'hsl(var(--background))',
  color: active ? 'white' : 'hsl(var(--foreground))',
  fontWeight: active ? 600 : 400,
});

function LegendGroup({ title, children }) {
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, marginBottom: 2 }}>{title}</div>
      {children}
    </>
  );
}

function LegendItem({ label, swatch, border, note, hidden, onClick }) {
  return (
    <div className="row" style={{ gap: 7, cursor: 'pointer', userSelect: 'none', opacity: hidden ? 0.35 : 1, transition: 'opacity .15s' }} onClick={onClick} title={hidden ? `Show ${label}` : `Hide ${label}`}>
      <span style={{ width: 14, height: 10, borderRadius: 2, background: swatch, border: border ? `1px solid ${border}` : 'none', flexShrink: 0, filter: hidden ? 'grayscale(1)' : 'none' }}/>
      <span style={{ fontSize: 11.5, textDecoration: hidden ? 'line-through' : 'none' }}>{label}</span>
      {note && <span className="muted mono" style={{ fontSize: 10, marginLeft: 'auto' }}>{note}</span>}
    </div>
  );
}

// Registers one map click listener for the map's lifetime; the latest callback is used on each click
function MapClickHandler({ onMapClick }) {
  const ctx = useMap();
  const map = ctx?.map;
  const callback = useRef(onMapClick);
  callback.current = onMapClick;
  useEffect(() => {
    if (!map) return;
    const handler = e => callback.current(e, map);
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [map]);
  return null;
}

function FlyToHighlight({ zones }) {
  const ctx = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!ctx?.map || !ctx.isLoaded || done.current || !zones.length) return;
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

export function MapScreen({ go, barangay, search, setSearch, highlightZones = [], setMapContext, askResult = null }) {
  const mapRef = useRef(null);

  // Opened from a barangay profile ("Show on map"): fly to that barangay
  useEffect(() => {
    const coords = barangay ? BARANGAY_COORDS[barangay] : null;
    if (!coords) return;
    const timer = setTimeout(() => mapRef.current?.flyTo({ center: coords, zoom: 14, duration: 1000 }), 600);
    return () => clearTimeout(timer);
  }, [barangay]);

  const [summary, setSummary] = useState([]);
  useEffect(() => {
    fetchSuitabilitySummary().then(setSummary).catch(e => console.warn('Suitability summary error', e));
  }, []);

  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { setShowSearch(!!search); }, [search]);
  // Map view: one theme at a time (zoning by default); manual layer changes switch to 'custom'
  const [view, setView] = useState('zoning');
  const [layers, setLayers] = useState(MAP_VIEWS.zoning.layers);
  const [suitUse, setSuitUse] = useState('reforestation');
  function chooseView(key) {
    setView(key);
    setLayers(MAP_VIEWS[key].layers);
    if (key === 'reforestation') zoomToStudyArea();
  }

  // Reforestation study area: barangays with verified reforestation or mangrove sites
  const [studyArea, setStudyArea] = useState({ barangays: [], note: '' });
  useEffect(() => {
    fetch('/reforestation', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => setStudyArea(json.study_area ?? { barangays: [], note: '' }))
      .catch(() => {});
  }, []);
  const reforestationView = view === 'reforestation';

  async function zoomToStudyArea() {
    const bounds = studyArea.barangays.length ? await barangayBounds(studyArea.barangays).catch(() => null) : null;
    // Union with the mangrove sites, most of which lie seaward of the barangay boundaries
    const [[w, s2], [e, n]] = bounds ?? [[125.6772, 7.2548], [125.7012, 7.2940]];
    mapRef.current?.fitBounds([[Math.min(w, 125.6772), Math.min(s2, 7.2548)], [Math.max(e, 125.7012), Math.max(n, 7.2940)]], { padding: { top: 60, bottom: 90, left: 250, right: 60 }, duration: 1000 });
  }
  function toggleLayer(key, on) { setView('custom'); setLayers(l => ({ ...l, [key]: on })); }
  const [basemap, setBasemap] = useState(() => {
    try { return localStorage.getItem('terraspec-basemap') || 'osm'; } catch { return 'osm'; }
  });
  function chooseBasemap(key) {
    setBasemap(key);
    try { localStorage.setItem('terraspec-basemap', key); } catch {}
  }
  const [hiddenZones, setHiddenZones] = useState(new Set());
  function toggleZone(id) { setHiddenZones(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  const [hiddenLevels, setHiddenLevels] = useState(new Set());
  function toggleLevel(level) { setHiddenLevels(prev => { const n = new Set(prev); n.has(level) ? n.delete(level) : n.add(level); return n; }); }
  const [hiddenLandslide, setHiddenLandslide] = useState(new Set());
  function toggleLandslide(label) { setHiddenLandslide(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; }); }
  const [hiddenFlood, setHiddenFlood] = useState(new Set());
  function toggleFlood(level) { setHiddenFlood(prev => { const n = new Set(prev); n.has(level) ? n.delete(level) : n.add(level); return n; }); }
  const [selectedPoint, setSelectedPoint]     = useState(null);
  const [nearestBarangay, setNearestBarangay] = useState(null);

  // Barangay names and boundaries on top of the map (on by default, remembered per browser)
  const [showBarangays, setShowBarangays] = useState(() => {
    try { return localStorage.getItem('terraspec-barangay-labels') !== 'off'; } catch { return true; }
  });
  function toggleBarangays(on) {
    setShowBarangays(on);
    try { localStorage.setItem('terraspec-barangay-labels', on ? 'on' : 'off'); } catch {}
  }

  // Actual mangrove reforestation sites (on by default, remembered per browser)
  const [showMangrove, setShowMangrove] = useState(() => {
    try { return localStorage.getItem('terraspec-mangrove-sites') !== 'off'; } catch { return true; }
  });
  function toggleMangrove(on) {
    setShowMangrove(on);
    try { localStorage.setItem('terraspec-mangrove-sites', on ? 'on' : 'off'); } catch {}
  }
  const [hiddenMangrove, setHiddenMangrove] = useState(new Set());
  function toggleMangroveStatus(status) { setHiddenMangrove(prev => { const n = new Set(prev); n.has(status) ? n.delete(status) : n.add(status); return n; }); }
  function zoomToMangroveSites() {
    mapRef.current?.fitBounds([[125.6772, 7.2548], [125.7012, 7.2940]], { padding: { top: 60, bottom: 90, left: 250, right: 60 }, duration: 1000 });
  }

  // Zoning query: filters, last result and the barangays it outlines on the map
  const [queryOpen, setQueryOpen] = useState(false);
  const [queryFilters, setQueryFilters] = useState(EMPTY_QUERY);
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const queryRequest = useRef(0);
  const [queryError, setQueryError] = useState(null);
  const queryNames = useMemo(() => queryResult?.by_barangay.map(b => b.barangay) ?? [], [queryResult]);
  // Zoning is faded under other themes, but not while a query shows its hazard on top of it
  const zoningFaded = layers.suitability || ((layers.flood || layers.landslide) && !queryResult);

  async function fitBarangays(names) {
    const bounds = names.length ? await barangayBounds(names).catch(() => null) : null;
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: { top: 60, bottom: 90, left: 250, right: 390 }, duration: 1000, maxZoom: 15 });
  }

  async function runQuery(filters = queryFilters) {
    // Only the latest query may update the map: an earlier one finishing late is ignored
    const request = ++queryRequest.current;
    setQueryLoading(true);
    setQueryError(null);
    try {
      const result = await runZoningQuery(filters);
      if (request !== queryRequest.current) return;
      setQueryResult(result);
      // Show the queried zoning classes, with the hazard class the condition refers to
      const flood = ['flood', 'hazard_free'].includes(filters.hazard);
      const landslide = ['landslide', 'hazard_free'].includes(filters.hazard);
      setView('custom');
      setLayers({ zoning: true, suitability: false, flood, landslide });
      setHiddenZones(new Set(filters.zones.length ? ZONING_LEGEND.map(z => z.id).filter(id => !filters.zones.includes(id)) : []));
      setHiddenFlood(new Set(FLOOD_LEGEND.map(l => l.val).filter(v => v !== 'Very High')));
      setHiddenLandslide(new Set(LANDSLIDE_LEGEND.map(l => l.val).filter(v => v !== 'High')));
      fitBarangays(result.by_barangay.map(b => b.barangay));
    } catch {
      if (request === queryRequest.current) setQueryError('Could not run the zoning query.');
    } finally {
      if (request === queryRequest.current) setQueryLoading(false);
    }
  }

  function runPreset(preset) {
    const filters = { ...EMPTY_QUERY, ...preset.filters };
    setQueryOpen(true);
    setQueryFilters(filters);
    runQuery(filters);
  }

  // Leave query mode: a query still running is cancelled so its late answer cannot reapply its filters
  function dropQueryResult() {
    queryRequest.current++;
    setQueryLoading(false);
    setQueryResult(null);
  }

  // Apply map filters extracted by the AI from a plain-language question (validated on the server)
  function applyAskResult(result) {
    if (result.view === 'suitability') {
      dropQueryResult();
      chooseView('suitability');
      if (result.land_use) setSuitUse(result.land_use);
      return;
    }
    if (result.view === 'reforestation') {
      dropQueryResult();
      chooseView('reforestation');
      return;
    }
    if (result.action === 'query') {
      const filters = {
        ...EMPTY_QUERY,
        zones: result.filters.zones,
        barangays: result.filters.barangays.map(b => b.id),
        hazard: result.filters.hazard,
        minArea: result.filters.min_area_ha ?? '',
      };
      setQueryOpen(true);
      setQueryFilters(filters);
      runQuery(filters);
      return;
    }
    dropQueryResult();
    chooseView(result.view);
  }

  // A question asked in the AI Assistant chat ("Show on map"): apply its filters after the map loads
  useEffect(() => {
    if (!askResult?.understood) return;
    const timer = setTimeout(() => applyAskResult(askResult), 700);
    return () => clearTimeout(timer);
  }, [askResult]);

  function clearQuery() {
    setQueryFilters(EMPTY_QUERY);
    dropQueryResult();
    setQueryError(null);
    chooseView('zoning');
    setHiddenZones(new Set());
    setHiddenFlood(new Set());
    setHiddenLandslide(new Set());
  }

  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  async function handleMapClick(e, map) {
    const [lng, lat] = [e.lngLat?.lng ?? 0, e.lngLat?.lat ?? 0];

    // Zoning class under the click, from the rendered Integrated Zoning Map layer
    const zoningFeature = map.getLayer('zoning-fill')
      ? map.queryRenderedFeatures(e.point, { layers: ['zoning-fill'] })[0]
      : null;
    const zoning = zoningFeature ? ZONING_LEGEND.find(z => z.id === zoningFeature.properties.zone) ?? null : null;

    // Mangrove reforestation site under the click (most lie seaward of the barangay boundaries)
    const siteFeature = map.getLayer('mangrove-fill')
      ? map.queryRenderedFeatures(e.point, { layers: ['mangrove-fill'] })[0]
      : null;
    const site = siteFeature ? siteFeature.properties : null;

    // Barangay containing the click (PSA boundaries), or the barangay the site belongs to
    const barangay = (await findBarangayAt(lng, lat).catch(() => null)) ?? site?.barangay ?? null;
    const scores = summaryRef.current.find(z => z.unit_name === barangay)?.scores ?? null;

    setSelectedPoint({ coords: [lng, lat], barangay, zoning, scores, site });
    setNearestBarangay(barangay);
    if (setMapContext && barangay) {
      setMapContext(buildMapContext(barangay, zoning, summaryRef.current));
    }
  }


  const filteredBarangays = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return PANABO.barangays.filter(b => b.toLowerCase().includes(q) && BARANGAY_COORDS[b]).slice(0, 4);
  }, [search]);
  const hasResults = filteredBarangays.length > 0;

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Map fills full area */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Map ref={mapRef} center={[125.6847, 7.307]} zoom={12.5} minZoom={10} maxZoom={18} className="h-full w-full">
          <MapControls showCompass showFullscreen position="top-right"/>
          <BasemapLayer basemap={basemap}/>
          <MapClickHandler onMapClick={handleMapClick}/>
          <ZoningLayer visible={layers.zoning} hiddenZones={hiddenZones} faded={zoningFaded}/>
          <SuitabilityLayer visible={layers.suitability} use={suitUse} hiddenLevels={hiddenLevels}/>
          <LandslideLayer visible={layers.landslide} hiddenLandslide={hiddenLandslide}/>
          <FloodLayer visible={layers.flood} hiddenFlood={hiddenFlood}/>
          <QueryBarangayLayer names={queryNames}/>
          <MangroveSitesLayer visible={showMangrove || reforestationView} hiddenStatuses={hiddenMangrove}/>
          <BarangayLabelLayer visible={showBarangays || reforestationView} only={reforestationView ? studyArea.barangays : null}/>
          {highlightZones.length > 0 && <FlyToHighlight zones={highlightZones}/>}
          {highlightZones.map((z, i) => {
            const coords = BARANGAY_COORDS[z.unit_name];
            if (!coords) return null;
            const color = levelStyle(z.suitability_level).hex;
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
                    {selectedPoint.site && (() => {
                      const site = selectedPoint.site;
                      const status = MANGROVE_LEGEND.find(l => l.val === site.status);
                      return (
                        <div style={{ borderLeft: `3px solid ${status?.hex ?? '#6b7280'}`, paddingLeft: 8, marginBottom: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{site.name}</div>
                          <div style={{ fontSize: 11.5 }}>
                            {status?.label.replace(/ \(.*\)/, '') ?? site.status}
                            {site.year && site.year !== 'null' ? ` · ${site.year}` : ''}
                            {site.adopter && site.adopter !== 'null' ? ` · adopted by ${site.adopter}` : ''}
                          </div>
                          <div className="muted" style={{ fontSize: 11 }}>
                            {Number(site.area_ha).toFixed(2)} ha mangrove site · {Math.round(site.mangrove_zone_share * 100)}% in Mangrove sub-zone
                          </div>
                        </div>
                      );
                    })()}
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
                            <span className="mono" style={{ color: levelStyle(selectedPoint.scores[k].level).hex }}>{selectedPoint.scores[k].pct}%</span>
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

      {/* Ask the map: plain-language question -> AI-extracted map filters */}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 31, width: queryOpen ? 'min(440px, calc(100% - 780px))' : 'min(560px, calc(100% - 520px))', minWidth: 300, transition: 'width .2s', display: 'flex', justifyContent: 'center' }}>
        <AskTheMap onResult={applyAskResult} initialResult={askResult}/>
      </div>

      {/* AI Recommendations banner */}
      {highlightZones.length > 0 && (
        <div style={{
          position: 'absolute', top: 104, left: '50%', transform: 'translateX(-50%)',
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
            </div>
          </Card>
        </div>
      )}

      {/* Zoning query: open the panel or run a preset query – bottom center of map */}
      <div style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 11 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="chip" onClick={() => setQueryOpen(o => !o)} style={{ background: 'hsl(var(--brand))', color: 'white', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="filter" size={12}/> Zoning query
          </button>
          {ZONING_QUERY_PRESETS.map(preset => (
            <button key={preset.label} className="chip" onClick={() => runPreset(preset)} style={{ background: 'hsl(var(--background))', fontSize: 12 }}>{preset.label}</button>
          ))}
        </div>
      </div>

      {queryOpen && (
        <div style={{ position: 'absolute', top: 16, right: 56, bottom: 96, width: 320, zIndex: 12, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
            <ZoningQueryPanel
              filters={queryFilters}
              setFilters={setQueryFilters}
              result={queryResult}
              loading={queryLoading}
              error={queryError}
              onRun={() => runQuery()}
              onClear={clearQuery}
              onClose={() => setQueryOpen(false)}
              onFocusBarangay={name => fitBarangays([name])}
            />
          </div>
        </div>
      )}

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
            <div style={sectionLabel}>View</div>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {Object.entries(MAP_VIEWS).map(([key, def]) => (
                <button key={key} onClick={() => chooseView(key)} style={chip(view === key)}>{def.label}</button>
              ))}
            </div>
            {layers.suitability && (
              <select className="input" value={suitUse} onChange={e => setSuitUse(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, marginBottom: 8 }}>
                {Object.entries(SUITABILITY_USES).map(([k, label]) => <option key={k} value={k}>{label} suitability</option>)}
              </select>
            )}
            <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
              {[['zoning', 'Zoning ordinance'], ['suitability', 'Suitability'], ['landslide', 'Landslide hazard'], ['flood', 'Flood hazard']].map(([k, label]) => (
                <label key={k} className="row" style={{ gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 12.5 }}>
                  <input type="checkbox" checked={layers[k]} onChange={e => toggleLayer(k, e.target.checked)} style={{ accentColor: 'hsl(var(--brand))' }}/>
                  <span>{label}</span>
                </label>
              ))}
              <label className="row" style={{ gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 12.5 }}>
                <input type="checkbox" checked={showBarangays} onChange={e => toggleBarangays(e.target.checked)} style={{ accentColor: 'hsl(var(--brand))' }}/>
                <span>Barangay names</span>
              </label>
              <label className="row" style={{ gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 12.5 }}>
                <input type="checkbox" checked={showMangrove} onChange={e => toggleMangrove(e.target.checked)} style={{ accentColor: 'hsl(var(--brand))' }}/>
                <span>Mangrove sites</span>
              </label>
            </div>
            <div className="separator"/>
            <div style={{ ...sectionLabel, margin: '10px 0 7px' }}>Legend · click to toggle</div>
            <div className="stack" style={{ gap: 5 }}>
              {layers.flood && (
                <LegendGroup title="Flood hazard (MGB 2020)">
                  {FLOOD_LEGEND.map(item => (
                    <LegendItem key={item.val} label={item.label} swatch={hatchSwatch(item.hex)} border={item.hex} hidden={hiddenFlood.has(item.val)} onClick={() => toggleFlood(item.val)}/>
                  ))}
                </LegendGroup>
              )}
              {layers.landslide && (
                <LegendGroup title="Landslide hazard (MGB 2020)">
                  {LANDSLIDE_LEGEND.map(item => (
                    <LegendItem key={item.val} label={item.label} swatch={hatchSwatch(item.hex, true)} border={item.hex} hidden={hiddenLandslide.has(item.val)} onClick={() => toggleLandslide(item.val)}/>
                  ))}
                </LegendGroup>
              )}
              {layers.suitability && (
                <LegendGroup title={`${SUITABILITY_USES[suitUse]} suitability (AHP-WLC)`}>
                  {SUITABILITY_LEGEND.map(item => (
                    <LegendItem
                      key={item.label} label={item.label} swatch={item.hex}
                      note={`${summary.filter(z => z.scores?.[suitUse]?.level === item.label).length} brgy`}
                      hidden={hiddenLevels.has(item.label)} onClick={() => toggleLevel(item.label)}
                    />
                  ))}
                </LegendGroup>
              )}
              {reforestationView && studyArea.note && (
                <div className="muted" style={{ fontSize: 11, lineHeight: 1.45, marginBottom: 4 }}>{studyArea.note}</div>
              )}
              {(showMangrove || reforestationView) && (
                <LegendGroup title="Mangrove reforestation sites">
                  {MANGROVE_LEGEND.map(item => (
                    <LegendItem key={item.val} label={item.label} swatch={item.hex} hidden={hiddenMangrove.has(item.val)} onClick={() => toggleMangroveStatus(item.val)}/>
                  ))}
                  <button onClick={zoomToMangroveSites} style={{ alignSelf: 'flex-start', fontSize: 11, padding: 0, marginTop: 2, border: 'none', background: 'none', color: 'hsl(var(--brand))', cursor: 'pointer', fontWeight: 600 }}>
                    Zoom to sites →
                  </button>
                </LegendGroup>
              )}
              {layers.zoning && (
                <LegendGroup title={`Zoning 2020-2029${zoningFaded ? ' (faded)' : ''}`}>
                  {ZONING_LEGEND.map(z => (
                    <LegendItem key={z.id} label={z.label} swatch={z.hex} note={z.id} hidden={hiddenZones.has(z.id)} onClick={() => toggleZone(z.id)}/>
                  ))}
                </LegendGroup>
              )}
              {!Object.values(layers).some(Boolean) && !reforestationView && <div className="muted" style={{ fontSize: 11.5 }}>No layers shown. Pick a view above.</div>}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Scale indicator */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}>
        <Badge variant="outline" style={{ background: 'hsl(var(--background))' }}>
          <Icon name="info" size={11}/>&nbsp;Lat 7.3088° · Lng 125.6841° · 1:8,000
        </Badge>
      </div>

      {/* AI Chat bubble */}
      <MapChatBubble selectedPoint={selectedPoint} nearestBarangay={nearestBarangay} rightOffset={16}/>
    </div>
  );
}
