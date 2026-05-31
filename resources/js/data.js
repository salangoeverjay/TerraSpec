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

// Barangay centroids for Panabo City [lng, lat]
// OSM-verified (22): Buenavista, Cacao, Cagangohan, Consolacion, Datu Abdul Dadia,
//   Gredu, J.P. Laurel, Katipunan, Kauswagan, Mabunao, Maduao, Malativas, Manay,
//   New Pandan, New Visayas, San Francisco, San Nicolas, San Pedro,
//   San Roque, San Vicente, Santo Nino, Tibungol
// Estimated (18): remaining barangays based on relative position within the city
export const BARANGAY_COORDS = {
  'A.O. Floirendo':   [125.7423, 7.3318],  // est. northeast estate
  'Buenavista':       [125.5912, 7.2747],  // OSM
  'Cacao':            [125.6072, 7.3079],  // OSM
  'Cagangohan':       [125.6824, 7.2855],  // OSM
  'Consolacion':      [125.5537, 7.3165],  // OSM
  'Dapco':            [125.6401, 7.2610],  // est. south-central
  'Datu Abdul Dadia': [125.6547, 7.3151],  // OSM
  'Gredu':            [125.6787, 7.2967],  // OSM
  'J.P. Laurel':      [125.6696, 7.2752],  // OSM
  'Kasilak':          [125.5905, 7.3407],  // est. northwest
  'Katipunan':        [125.6310, 7.3016],  // OSM
  'Katualan':         [125.5712, 7.2412],  // est. far south
  'Kauswagan':        [125.5827, 7.3099],  // OSM
  'Kiotoy':           [125.6194, 7.2718],  // est. south
  'Little Panay':     [125.6118, 7.3224],  // est. central
  'Lower Panaga':     [125.7198, 7.3042],  // est. coastal east
  'Mabunao':          [125.5753, 7.2556],  // OSM
  'Maduao':           [125.6421, 7.2796],  // OSM
  'Malativas':        [125.5654, 7.2947],  // OSM
  'Manay':            [125.6028, 7.3462],  // OSM
  'Nanyo':            [125.6498, 7.2847],  // est. central
  'New Malaga':       [125.5602, 7.2854],  // est. west
  'New Malitbog':     [125.6002, 7.2912],  // est. west-central
  'New Pandan':       [125.6852, 7.2989],  // OSM
  'New Visayas':      [125.6676, 7.3082],  // OSM
  'Quezon':           [125.6752, 7.3001],  // est. urban core
  'Salvacion':        [125.6722, 7.2901],  // est. urban core
  'San Francisco':    [125.6789, 7.3114],  // OSM
  'San Nicolas':      [125.6179, 7.2635],  // OSM
  'San Pedro':        [125.7100, 7.2972],  // OSM
  'San Roque':        [125.5497, 7.2504],  // OSM
  'San Vicente':      [125.7011, 7.3163],  // OSM
  'Santa Cruz':       [125.5797, 7.2358],  // est. far south
  'Santo Nino':       [125.6898, 7.3064],  // OSM
  'Sindaton':         [125.7152, 7.2848],  // est. coastal east
  'Southern Davao':   [125.6853, 7.2641],  // est. south urban
  'Tagpore':          [125.6221, 7.3306],  // est. north-central
  'Tibungol':         [125.5516, 7.4010],  // OSM (far north)
  'Upper Licanan':    [125.6312, 7.2514],  // est. south
  'Waterfall':        [125.5898, 7.2653],  // est. west
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

export const PANABO = {
  zones: [
    { id: 'R-1',  name: 'Residential',   hex: '#f97316', allowed_use: 'Single-family dwellings, townhouses, home occupations, parks.' },
    { id: 'C-1',  name: 'Commercial',    hex: '#3b82f6', allowed_use: 'Retail, offices, restaurants, hotels, mixed-use commercial.' },
    { id: 'I-1',  name: 'Industrial',    hex: '#8b5cf6', allowed_use: 'Light manufacturing, warehousing, agro-industrial processing.' },
    { id: 'A-1',  name: 'Agricultural',  hex: '#84cc16', allowed_use: 'Crop cultivation, aquaculture, farm support structures.' },
    { id: 'M-1',  name: 'Mangrove',      hex: '#10b981', allowed_use: 'Mangrove rehabilitation, eco-tourism (light), fish pens (limited).' },
    { id: 'IN-1', name: 'Institutional', hex: '#06b6d4', allowed_use: 'Government buildings, schools, hospitals, civic centers.' },
    { id: 'P-1',  name: 'Protected',     hex: '#ef4444', allowed_use: 'Strict conservation, no permanent structures, research only.' },
    { id: 'MX-1', name: 'Mixed Use',     hex: '#ec4899', allowed_use: 'Residential + commercial ground floor, live-work units.' },
  ],
  parcels: [],
  barangayRankings: [
    { barangay: 'Quezon',           zone: 'C-1', score: 91, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'Salvacion',        zone: 'C-1', score: 88, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'New Visayas',      zone: 'C-1', score: 85, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'San Francisco',    zone: 'C-1', score: 83, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'Santo Nino',       zone: 'C-1', score: 81, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'J.P. Laurel',      zone: 'R-1', score: 79, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'New Pandan',       zone: 'R-1', score: 78, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'San Vicente',      zone: 'R-1', score: 76, flood: 'Low',  slope: '1–5%',   flag: null },
    { barangay: 'Gredu',            zone: 'R-1', score: 74, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'Cagangohan',       zone: 'I-1', score: 72, flood: 'Med',  slope: '0–3%',   flag: null },
    { barangay: 'San Pedro',        zone: 'R-1', score: 70, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'A.O. Floirendo',   zone: 'I-1', score: 68, flood: 'Med',  slope: '0–3%',   flag: null },
    { barangay: 'Maduao',           zone: 'I-1', score: 67, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'Southern Davao',   zone: 'R-1', score: 66, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'Dapco',            zone: 'R-1', score: 65, flood: 'Med',  slope: '0–3%',   flag: null },
    { barangay: 'Datu Abdul Dadia', zone: 'R-1', score: 64, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'Lower Panaga',     zone: 'R-1', score: 63, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'Sindaton',         zone: 'R-1', score: 62, flood: 'Med',  slope: '0–3%',   flag: null },
    { barangay: 'Nanyo',            zone: 'R-1', score: 61, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'Tagpore',          zone: 'R-1', score: 60, flood: 'Med',  slope: '3–8%',   flag: null },
    { barangay: 'San Nicolas',      zone: 'R-1', score: 58, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'Katipunan',        zone: 'R-1', score: 57, flood: 'Med',  slope: '3–8%',   flag: null },
    { barangay: 'Kauswagan',        zone: 'R-1', score: 56, flood: 'Low',  slope: '1–5%',   flag: null },
    { barangay: 'Consolacion',      zone: 'R-1', score: 55, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'Little Panay',     zone: 'R-1', score: 54, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'Cacao',            zone: 'R-1', score: 53, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'New Malitbog',     zone: 'R-1', score: 52, flood: 'Med',  slope: '3–8%',   flag: null },
    { barangay: 'San Roque',        zone: 'R-1', score: 51, flood: 'Low',  slope: '0–3%',   flag: null },
    { barangay: 'Manay',            zone: 'R-1', score: 50, flood: 'Low',  slope: '3–8%',   flag: null },
    { barangay: 'Malativas',        zone: 'R-1', score: 48, flood: 'Med',  slope: '3–8%',   flag: null },
    { barangay: 'New Malaga',       zone: 'R-1', score: 46, flood: 'Low',  slope: '8–15%',  flag: null },
    { barangay: 'Kiotoy',           zone: 'R-1', score: 44, flood: 'Low',  slope: '8–15%',  flag: null },
    { barangay: 'Kasilak',          zone: 'R-1', score: 42, flood: 'High', slope: '1–5%',   flag: 'flood zone' },
    { barangay: 'Mabunao',          zone: 'R-1', score: 40, flood: 'High', slope: '0–3%',   flag: 'flood zone' },
    { barangay: 'Buenavista',       zone: 'R-1', score: 38, flood: 'High', slope: '0–3%',   flag: 'flood zone' },
    { barangay: 'Waterfall',        zone: 'R-1', score: 35, flood: 'High', slope: '0–3%',   flag: 'flood zone' },
    { barangay: 'Upper Licanan',    zone: 'R-1', score: 30, flood: 'Low',  slope: '8–15%',  flag: 'watershed' },
    { barangay: 'Tibungol',         zone: 'R-1', score: 27, flood: 'Low',  slope: '8–15%',  flag: 'watershed' },
    { barangay: 'Katualan',         zone: 'R-1', score: 24, flood: 'Low',  slope: '15–30%', flag: 'watershed' },
    { barangay: 'Santa Cruz',       zone: 'R-1', score: 22, flood: 'Low',  slope: '15–30%', flag: 'watershed' },
  ],
  criteria: [
    { id: 'soil',    name: 'Soil Quality',    weight: 0.25 },
    { id: 'water',   name: 'Water Access',    weight: 0.20 },
    { id: 'road',    name: 'Road Proximity',  weight: 0.20 },
    { id: 'slope',   name: 'Slope',           weight: 0.15 },
    { id: 'flood',   name: 'Flood Risk',      weight: 0.10 },
    { id: 'landUse', name: 'Land Use Compat', weight: 0.10 },
  ],
  species: [
    { id: 'bakawan',  name: 'Bakawan (Rhizophora apiculata)', score: 95, soil: 'Silty clay / mudflat', elevation: '0–3 m',   salinity: 'High', temp: '27–32°C', notes: 'Dominant mangrove pioneer, excellent coastal protection.' },
    { id: 'pagatpat', name: 'Pagatpat (Sonneratia alba)',    score: 88, soil: 'Sandy / muddy',        elevation: '0–2 m',   salinity: 'High', temp: '26–32°C', notes: 'Fast-growing, good for primary reforestation.' },
    { id: 'nipa',     name: 'Nipa Palm (Nypa fruticans)',    score: 80, soil: 'Alluvial / brackish',  elevation: '0–4 m',   salinity: 'Med',  temp: '25–30°C', notes: 'Provides livelihood (nipa wine, leaves).' },
    { id: 'molave',   name: 'Molave (Vitex parviflora)',     score: 72, soil: 'Sandy loam / upland',  elevation: '5–200 m', salinity: 'Low',  temp: '24–30°C', notes: 'Hardwood for degraded upland sites.' },
    { id: 'ipil',     name: 'Ipil (Intsia bijuga)',          score: 68, soil: 'Well-drained loam',    elevation: '0–600 m', salinity: 'Low',  temp: '24–30°C', notes: 'Rare hardwood; high conservation value.' },
    { id: 'yakal',    name: 'Yakal (Shorea astylosa)',       score: 61, soil: 'Clay / loam',          elevation: '100–500 m', salinity: 'None', temp: '22–28°C', notes: 'Philippine endemic dipterocarp.' },
    { id: 'dao',      name: 'Dao (Dracontomelon dao)',       score: 55, soil: 'Deep loam / clay',     elevation: '0–400 m', salinity: 'Low',  temp: '24–30°C', notes: 'Fast-growing multipurpose timber.' },
  ],
  restrictions: [
    { id: 'R01', name: 'Panabo Mangrove Park',       zone: 'M-1', severity: 'high',   description: 'Total ban on land conversion; DAO 2004-04 applies.' },
    { id: 'R02', name: 'Tibungol Watershed Reserve', zone: 'P-1', severity: 'high',   description: 'Watershed protection under NIPAS Act (RA 7586).' },
    { id: 'R03', name: 'Agricultural Buffer Zone',   zone: 'A-1', severity: 'medium', description: 'CARP restrictions; conversion requires DAR clearance.' },
    { id: 'R04', name: '3-meter Road Easement',      zone: null,  severity: 'low',    description: 'National Building Code setback along classified roads.' },
    { id: 'R05', name: '20-meter Riparian Buffer',   zone: null,  severity: 'medium', description: 'Clean Water Act (RA 9275) buffer along rivers/streams.' },
  ],
  barangays: [
    'A.O. Floirendo','Buenavista','Cacao','Cagangohan','Consolacion',
    'Dapco','Datu Abdul Dadia','Gredu','J.P. Laurel','Kasilak',
    'Katipunan','Katualan','Kauswagan','Kiotoy','Little Panay',
    'Lower Panaga','Mabunao','Maduao','Malativas','Manay',
    'Nanyo','New Malaga','New Malitbog','New Pandan','New Visayas',
    'Quezon','Salvacion','San Francisco','San Nicolas','San Pedro',
    'San Roque','San Vicente','Santa Cruz','Santo Nino','Sindaton',
    'Southern Davao','Tagpore','Tibungol','Upper Licanan','Waterfall',
  ],
  reports: [
    { id: 'RPT-001', type: 'Suitability Summary',    barangay: 'Gredu',          date: '2026-05-20', status: 'Final',    generatedBy: 'CPDO' },
    { id: 'RPT-002', type: 'Environmental Clearance', barangay: 'Cagangohan',    date: '2026-05-15', status: 'Draft',    generatedBy: 'CENRO' },
    { id: 'RPT-003', type: 'Zone Compliance Check',  barangay: 'New Visayas',    date: '2026-05-10', status: 'Final',    generatedBy: 'CPDO' },
    { id: 'RPT-004', type: 'Reforestation Plan',     barangay: 'Upper Licanan',  date: '2026-04-28', status: 'Review',   generatedBy: 'CENRO' },
    { id: 'RPT-005', type: 'Suitability Summary',    barangay: 'San Vicente',    date: '2026-04-15', status: 'Archived', generatedBy: 'CPDO' },
  ],
  recentQueries: [
    { id: 1, text: 'What is the flood risk for PCL-00473?',          time: '2 min ago' },
    { id: 2, text: 'Compare commercial suitability in Sto. Tomas',   time: '18 min ago' },
    { id: 3, text: 'Which parcels are suitable for reforestation?',  time: '1 hr ago' },
    { id: 4, text: 'Setback requirements along New Visayas road',    time: '3 hrs ago' },
  ],
};
