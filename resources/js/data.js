export const CHAT_STORAGE_KEY = 'terraspec-chat-conversations'; // legacy key — no longer written
export const ADMIN_CHAT_KEY   = 'terraspec-chat-admin';
export const GUEST_TOKEN_KEY  = 'terraspec-guest-token';

export function getOrCreateGuestToken() {
  if (typeof window === 'undefined') return 'OFFLINE';
  try {
    let token = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
      const seg = () => Math.random().toString(36).slice(2, 7).toUpperCase();
      token = `${seg()}-${seg()}`;
      localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch { return 'OFFLINE'; }
}

export function getChatStorageKey(role) {
  if (role === 'admin') return ADMIN_CHAT_KEY;
  return `terraspec-chat-guest-${getOrCreateGuestToken()}`;
}

// Barangay interior points for Panabo City [lng, lat], computed from the PSA 2023 barangay
// boundaries (public/data/panabo_barangays.geojson). Keys match zone_units.unit_name.
export const BARANGAY_COORDS = {
  'A.O. Floirendo':   [125.5928, 7.4166],
  'Buenavista':       [125.5844, 7.2770],
  'Cacao':            [125.6077, 7.3111],
  'Cagangohan':       [125.6824, 7.2857],
  'Consolacion':      [125.5618, 7.3192],
  'Dapco':            [125.5997, 7.3862],
  'Datu Abdul Dadia': [125.6576, 7.3088],
  'Gredu':            [125.6746, 7.2957],
  'J.P. Laurel':      [125.6735, 7.2737],
  'Kasilak':          [125.5906, 7.3295],
  'Katipunan':        [125.6315, 7.3079],
  'Katualan':         [125.5586, 7.2321],
  'Kauswagan':        [125.5834, 7.3103],
  'Kiotoy':           [125.6027, 7.2505],
  'Little Panay':     [125.6495, 7.3029],
  'Lower Panaga':     [125.5552, 7.4387],
  'Mabunao':          [125.5785, 7.2584],
  'Maduao':           [125.6486, 7.2819],
  'Malativas':        [125.5628, 7.2971],
  'Manay':            [125.5947, 7.3458],
  'Nanyo':            [125.6372, 7.3404],
  'New Malaga':       [125.5588, 7.3507],
  'New Malitbog':     [125.6215, 7.3411],
  'New Pandan':       [125.6857, 7.2971],
  'New Visayas':      [125.6696, 7.3145],
  'Quezon':           [125.6750, 7.3312],
  'Salvacion':        [125.6897, 7.3185],
  'San Francisco':    [125.6807, 7.3128],
  'San Nicolas':      [125.6170, 7.2689],
  'San Pedro':        [125.7111, 7.2996],
  'San Roque':        [125.5576, 7.2588],
  'San Vicente':      [125.7017, 7.3090],
  'Santa Cruz':       [125.5857, 7.2314],
  'Santo Nino':       [125.6878, 7.3054],
  'Sindaton':         [125.5778, 7.4325],
  'Southern Davao':   [125.6544, 7.3356],
  'Tagpore':          [125.6264, 7.2764],
  'Tibungol':         [125.5555, 7.3947],
  'Upper Licanan':    [125.6153, 7.2899],
  'Waterfall':        [125.5822, 7.2906],
};

export function createConversation(title = 'New conversation') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    title,
    pinned: false,
    messages: [{ role: 'assistant', content: 'Ask me about zoning compliance, suitability scores, protected areas, or reforestation options for the current map view.' }],
  };
}

export function loadConversations(role = 'public') {
  const key = getChatStorageKey(role);
  if (typeof window === 'undefined') return [createConversation()];
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return [createConversation()];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(c => ({
        id: c.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        title: c.title || 'Conversation',
        pinned: !!c.pinned,
        messages: Array.isArray(c.messages) && c.messages.length > 0 ? c.messages : createConversation().messages,
      }));
    }
  } catch { /* ignore */ }
  return [createConversation()];
}

// Integrated Zoning Map C.Y. 2020-2029 classes, as digitized in public/data/zoning_2020.geojson
export const ZONING_LEGEND = [
  { id: 'PA',  label: 'Production Agricultural',      hex: '#009601' },
  { id: 'FR',  label: 'Forest Reserve',               hex: '#026401' },
  { id: 'MG',  label: 'Mangrove',                     hex: '#aec8e1' },
  { id: 'QZ',  label: 'Quarry',                       hex: '#993400' },
  { id: 'GR',  label: 'General Residential',          hex: '#ffff43' },
  { id: 'R-1', label: 'Residential - 1',              hex: '#e6e600' },
  { id: 'C',   label: 'Commercial (C-2 / C-3)',       hex: '#fe0000' },
  { id: 'GC',  label: 'General Commercial',           hex: '#b40c0c' },
  { id: 'AI',  label: 'Agri-Industrial',              hex: '#c796ff' },
  { id: 'I',   label: 'Industrial (I-1 / I-2 / I-3)', hex: '#9700c9' },
  { id: 'INS', label: 'General Institutional',        hex: '#0000fe' },
  { id: 'TZ',  label: 'Tourism',                      hex: '#fe9900' },
  { id: 'PRC', label: 'Parks / Cemetery',             hex: '#64e066' },
  { id: 'BG',  label: 'Buffer / Greenbelt',           hex: '#33e132' },
  { id: 'UTS', label: 'Utilities & Transport',        hex: '#bebebe' },
];

export const PANABO = {
  // No parcel-level data yet; analysis is per barangay (zone unit).
  parcels: [],
  barangays: Object.keys(BARANGAY_COORDS),
};

export const normalizeName = name => name.normalize('NFKD').replace(/[^\w]/g, '').toLowerCase();

let summaryPromise = null;

// Latest stored AHP-WLC result of every barangay for every land use (GET /suitability/summary).
export function fetchSuitabilitySummary() {
  if (!summaryPromise) {
    summaryPromise = fetch('/suitability/summary', { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => json.data)
      .catch(e => { summaryPromise = null; throw e; });
  }
  return summaryPromise;
}

let boundariesPromise = null;

function loadBarangayBoundaries() {
  if (!boundariesPromise) {
    boundariesPromise = fetch('/data/panabo_barangays.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch(e => { boundariesPromise = null; throw e; });
  }
  return boundariesPromise;
}

function ringContains(ring, lng, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonContains(rings, lng, lat) {
  return ringContains(rings[0], lng, lat) && !rings.slice(1).some(hole => ringContains(hole, lng, lat));
}

// Name of the barangay (as in zone_units) containing the point, or null outside Panabo.
export async function findBarangayAt(lng, lat) {
  const boundaries = await loadBarangayBoundaries();
  const names = Object.keys(BARANGAY_COORDS);
  for (const f of boundaries.features) {
    const g = f.geometry;
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    if (polygons.some(rings => polygonContains(rings, lng, lat))) {
      return names.find(n => normalizeName(n) === normalizeName(f.properties.name)) ?? f.properties.name;
    }
  }
  return null;
}
