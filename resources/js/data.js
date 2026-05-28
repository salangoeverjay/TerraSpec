export const CHAT_STORAGE_KEY = 'terraspec-chat-conversations';

// Barangay centroids for Panabo City [lng, lat]
// OSM-verified (22): Buenavista, Cacao, Cagangohan, Consolacion, Datu Abdul Dadia,
//   Gredu, J.P. Laurel, Katipunan, Kauswagan, Mabunao, Maduao, Malativas, Manay,
//   Minda, New Pandan, New Visayas, San Francisco, San Nicolas, San Pedro,
//   San Roque, San Vicente, Santo Niño, Tibungol
// Estimated (15): remaining barangays based on relative position within the city
export const BARANGAY_COORDS = {
  'Buenavista':       [125.5912, 7.2747],  // OSM
  'Cacao':            [125.6072, 7.3079],  // OSM
  'Cagangohan':       [125.6824, 7.2855],  // OSM
  'Consolacion':      [125.5537, 7.3165],  // OSM
  'Datu Abdul Dadia': [125.6547, 7.3151],  // OSM
  'Gredu':            [125.6787, 7.2967],  // OSM
  'J.P. Laurel':      [125.6696, 7.2752],  // OSM
  'Kakar':            [125.6760, 7.3075],  // est. urban core
  'Katipunan':        [125.6310, 7.3016],  // OSM
  'Kauswagan':        [125.5827, 7.3099],  // OSM
  'Langcam':          [125.6420, 7.3380],  // est. between Cacao and Manay
  'Mabunao':          [125.5753, 7.2556],  // OSM
  'Maduao':           [125.6421, 7.2796],  // OSM
  'Malativas':        [125.5654, 7.2947],  // OSM
  'Manay':            [125.6028, 7.3462],  // OSM
  'Matiao':           [125.6700, 7.3200],  // est. north of San Francisco
  'Minda':            [125.5822, 7.3583],  // OSM
  'Mindanao':         [125.6370, 7.3500],  // est. between Minda and Manay
  'New Corella':      [125.6200, 7.3680],  // est. far north
  'New Jerusalem':    [125.7050, 7.2890],  // est. near New Pandan, east side
  'New Pandan':       [125.6852, 7.2989],  // OSM
  'New Visayas':      [125.6676, 7.3082],  // OSM
  'Padada':           [125.6500, 7.3100],  // est. between Katipunan and Datu Abdul Dadia
  'Panabo':           [125.6820, 7.3060],  // est. urban core
  'Poblacion':        [125.6842, 7.3081],  // city center
  'San Francisco':    [125.6789, 7.3114],  // OSM
  'San Nicolas':      [125.6179, 7.2635],  // OSM
  'San Pedro':        [125.7100, 7.2972],  // OSM
  'San Roque':        [125.5497, 7.2504],  // OSM
  'San Vicente':      [125.7011, 7.3163],  // OSM
  'Santo Niño':       [125.6898, 7.3064],  // OSM
  'Sto. Tomas':       [125.6821, 7.3102],  // parcel ref.
  'Tagbobo':          [125.6920, 7.2870],  // est. south-east
  'Tibungol':         [125.5516, 7.4010],  // OSM (far north)
  'Toto':             [125.6280, 7.3680],  // est. far north
  'Tuganay':          [125.6720, 7.3260],  // est. north of center
  'Ula':              [125.6810, 7.2980],  // est. south of center
  'Wangan':           [125.7120, 7.3060],  // est. east side
};

export function createConversation(title = 'New conversation') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    title,
    pinned: false,
    messages: [{ role: 'assistant', content: 'Ask me about zoning compliance, suitability scores, protected areas, or reforestation options for the current map view.' }],
  };
}

export function loadConversations() {
  if (typeof window === 'undefined') return [createConversation()];
  try {
    const saved = window.localStorage.getItem(CHAT_STORAGE_KEY);
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
    { barangay: 'Poblacion',        zone: 'C-1', score: 91, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'Sto. Tomas',       zone: 'C-1', score: 88, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'New Visayas',      zone: 'C-1', score: 85, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'San Francisco',    zone: 'C-1', score: 83, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'Kakar',            zone: 'C-1', score: 81, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'J.P. Laurel',      zone: 'R-1', score: 79, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'Santo Niño',       zone: 'R-1', score: 78, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'New Pandan',       zone: 'R-1', score: 76, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'San Vicente',      zone: 'R-1', score: 74, flood: 'Low',  slope: '1–5%',  flag: null },
    { barangay: 'Tuganay',          zone: 'R-1', score: 72, flood: 'Low',  slope: '1–5%',  flag: null },
    { barangay: 'Panabo',           zone: 'R-1', score: 71, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'Gredu',            zone: 'I-1', score: 70, flood: 'Low',  slope: '0–3%',  flag: null },
    { barangay: 'Cagangohan',       zone: 'I-1', score: 68, flood: 'Med',  slope: '0–3%',  flag: null },
    { barangay: 'Maduao',           zone: 'I-1', score: 67, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'New Jerusalem',    zone: 'R-1', score: 66, flood: 'Low',  slope: '1–5%',  flag: null },
    { barangay: 'Tagbobo',          zone: 'R-1', score: 65, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Datu Abdul Dadia', zone: 'R-1', score: 64, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Wangan',           zone: 'R-1', score: 63, flood: 'Low',  slope: '1–5%',  flag: null },
    { barangay: 'Ula',              zone: 'R-1', score: 62, flood: 'Med',  slope: '0–3%',  flag: null },
    { barangay: 'Matiao',           zone: 'R-1', score: 61, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Padada',           zone: 'R-1', score: 60, flood: 'Med',  slope: '3–8%',  flag: null },
    { barangay: 'San Nicolas',      zone: 'R-1', score: 58, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Katipunan',        zone: 'R-1', score: 57, flood: 'Med',  slope: '3–8%',  flag: null },
    { barangay: 'Kauswagan',        zone: 'R-1', score: 56, flood: 'Med',  slope: '1–5%',  flag: null },
    { barangay: 'Consolacion',      zone: 'R-1', score: 55, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Langcam',          zone: 'R-1', score: 54, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Cacao',            zone: 'R-1', score: 53, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Mindanao',         zone: 'R-1', score: 52, flood: 'Med',  slope: '3–8%',  flag: null },
    { barangay: 'San Pedro',        zone: 'R-1', score: 51, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Manay',            zone: 'R-1', score: 50, flood: 'Low',  slope: '3–8%',  flag: null },
    { barangay: 'Malativas',        zone: 'R-1', score: 48, flood: 'Med',  slope: '3–8%',  flag: null },
    { barangay: 'New Corella',      zone: 'R-1', score: 46, flood: 'Low',  slope: '8–15%', flag: null },
    { barangay: 'Toto',             zone: 'R-1', score: 44, flood: 'Low',  slope: '8–15%', flag: null },
    { barangay: 'Minda',            zone: 'R-1', score: 42, flood: 'High', slope: '1–5%',  flag: 'flood zone' },
    { barangay: 'Buenavista',       zone: 'R-1', score: 40, flood: 'High', slope: '0–3%',  flag: 'flood zone' },
    { barangay: 'Mabunao',          zone: 'R-1', score: 38, flood: 'High', slope: '0–3%',  flag: 'flood zone' },
    { barangay: 'San Roque',        zone: 'R-1', score: 35, flood: 'High', slope: '0–3%',  flag: 'flood zone' },
    { barangay: 'Tibungol',         zone: 'R-1', score: 22, flood: 'Low',  slope: '8–15%', flag: 'watershed' },
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
    'Buenavista','Cacao','Cagangohan','Consolacion','Datu Abdul Dadia','Gredu','J.P. Laurel',
    'Kakar','Katipunan','Kauswagan','Langcam','Mabunao','Maduao','Malativas','Manay','Matiao',
    'Minda','Mindanao','New Corella','New Jerusalem','New Pandan','New Visayas','Padada',
    'Panabo','Poblacion','San Francisco','San Nicolas','San Pedro','San Roque','San Vicente',
    'Santo Niño','Sto. Tomas','Tagbobo','Tibungol','Toto','Tuganay','Ula','Wangan',
  ],
  reports: [
    { id: 'RPT-001', type: 'Suitability Summary',    parcel: 'PCL-00184', date: '2026-05-20', status: 'Final',    generatedBy: 'CPDO' },
    { id: 'RPT-002', type: 'Environmental Clearance', parcel: 'PCL-00473', date: '2026-05-15', status: 'Draft',    generatedBy: 'CENRO' },
    { id: 'RPT-003', type: 'Zone Compliance Check',  parcel: 'PCL-00291', date: '2026-05-10', status: 'Final',    generatedBy: 'CPDO' },
    { id: 'RPT-004', type: 'Reforestation Plan',     parcel: 'PCL-00608', date: '2026-04-28', status: 'Review',   generatedBy: 'CENRO' },
    { id: 'RPT-005', type: 'Suitability Summary',    parcel: 'PCL-00715', date: '2026-04-15', status: 'Archived', generatedBy: 'CPDO' },
  ],
  recentQueries: [
    { id: 1, text: 'What is the flood risk for PCL-00473?',          time: '2 min ago' },
    { id: 2, text: 'Compare commercial suitability in Sto. Tomas',   time: '18 min ago' },
    { id: 3, text: 'Which parcels are suitable for reforestation?',  time: '1 hr ago' },
    { id: 4, text: 'Setback requirements along New Visayas road',    time: '3 hrs ago' },
  ],
};
