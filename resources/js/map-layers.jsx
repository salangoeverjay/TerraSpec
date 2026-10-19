import { useEffect, useRef } from 'react';
import { useMap } from '../../components/ui/map';
import { ZONING_LEGEND, fetchSuitabilitySummary, normalizeName } from './data.js';

// ── Legends (also used by the map layers' paint) ───────────────────────────────

// Flood: blues (water), drawn as hatching so the zoning underneath stays visible
export const FLOOD_LEGEND = [
  { label: 'Very High', val: 'Very High', hex: '#08306b' },
  { label: 'High',      val: 'High',      hex: '#2171b5' },
  { label: 'Moderate',  val: 'Moderate',  hex: '#6baed6' },
];

// Landslide: browns, hatched in the opposite direction to flood
export const LANDSLIDE_LEGEND = [
  { label: 'High',     val: 'High',     hex: '#7f2704' },
  { label: 'Moderate', val: 'Moderate', hex: '#c58f4e' },
];

// Barangay suitability (stored AHP-WLC result) for one land use
export const SUITABILITY_LEGEND = [
  { label: 'Highly Suitable',     hex: '#1a9850' },
  { label: 'Moderately Suitable', hex: '#fee08b' },
  { label: 'Low Suitability',     hex: '#fc8d59' },
  { label: 'Not Suitable',        hex: '#d73027' },
];

export const SUITABILITY_USES = {
  commercial: 'Commercial', residential: 'Residential', industrial: 'Industrial',
  agricultural: 'Agricultural', reforestation: 'Reforestation',
};

// One theme at a time; zoning is faded whenever another theme is shown on top of it
export const MAP_VIEWS = {
  zoning:      { label: 'Zoning',      layers: { zoning: true,  suitability: false, landslide: false, flood: false } },
  flood:       { label: 'Flood',       layers: { zoning: true,  suitability: false, landslide: false, flood: true } },
  landslide:   { label: 'Landslide',   layers: { zoning: true,  suitability: false, landslide: true,  flood: false } },
  suitability: { label: 'Suitability', layers: { zoning: false, suitability: true,  landslide: false, flood: false } },
};

// CSS swatch matching a hatched map fill
export function hatchSwatch(hex, reverse = false) {
  return `repeating-linear-gradient(${reverse ? '-45deg' : '45deg'}, ${hex} 0 2px, transparent 2px 5px)`;
}

// Bottom → top drawing order of the TerraSpec overlays (basemaps go below all of them)
export const OVERLAY_ORDER = ['zoning', 'suitability', 'landslide', 'flood', 'query'];
export const OVERLAY_LAYER_IDS = OVERLAY_ORDER.flatMap(id => [`${id}-fill`, `${id}-line`]);

const ZONING_COLOR = ['match', ['get', 'zone'], ...ZONING_LEGEND.flatMap(z => [z.id, z.hex]), '#888888'];

// ── Hatch pattern images ─────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ensureHatch(map, name, hex, reverse) {
  if (map.hasImage(name)) return;
  const size = 12;
  const [r, g, b] = hexToRgb(hex);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = (((reverse ? x - y : x + y) % 6) + 6) % 6;
      const i = (y * size + x) * 4;
      if (d < 2) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 235; }
    }
  }
  map.addImage(name, { width: size, height: size, data });
}

const hatchName = (prefix, val) => `hatch-${prefix}-${val.toLowerCase().replace(/\s+/g, '-')}`;

// ── Shared overlay hook ──────────────────────────────────────────────────────

/**
 * Adds a GeoJSON source with a fill and a line layer, keeping visibility, filter and paint in sync.
 * Visibility and filter are applied when the layers are created, so a layer that is off at
 * startup stays off when its data arrives.
 */
function useOverlay({ id, load, loadKey = '', visible, filter = null, fill, line, beforeAdd }) {
  const ctx = useMap();
  const map = ctx?.map;
  // True once the map has loaded and its style is processed; goes false→true again after a
  // style swap (light/dark theme), which removes custom layers, so they are re-added below.
  const ready = !!ctx?.isLoaded;
  const latest = useRef({});
  latest.current = { visible, filter, fill, line };
  const loaded = useRef({ key: null, data: null });

  useEffect(() => {
    if (!map || !ready) return;
    let active = true;

    const show = (data, key) => {
      try {
        if (map.getSource(id)) {
          if (loaded.current.appliedKey !== key) map.getSource(id).setData(data);
        } else {
          beforeAdd?.(map);
          const { visible: vis, filter: f, fill: fillPaint, line: linePaint } = latest.current;
          const above = OVERLAY_ORDER.slice(OVERLAY_ORDER.indexOf(id) + 1).map(o => `${o}-fill`).find(l => map.getLayer(l));
          const layout = { visibility: vis ? 'visible' : 'none' };
          map.addSource(id, { type: 'geojson', data });
          map.addLayer({ id: `${id}-fill`, type: 'fill', source: id, layout, paint: fillPaint, ...(f ? { filter: f } : {}) }, above);
          map.addLayer({ id: `${id}-line`, type: 'line', source: id, layout, paint: linePaint, ...(f ? { filter: f } : {}) }, above);
        }
        loaded.current.appliedKey = key;
      } catch (e) { console.warn(`${id} layer error`, e); }
    };

    // Data already loaded for this key (e.g. re-adding after a theme switch): no new download
    if (loaded.current.key === loadKey && loaded.current.data) {
      show(loaded.current.data, loadKey);
      return () => { active = false; };
    }

    load()
      .then(data => {
        if (!active) return;
        loaded.current = { ...loaded.current, key: loadKey, data };
        show(data, loadKey);
      })
      .catch(e => console.warn(`${id} data error`, e));

    return () => { active = false; };
  }, [map, ready, loadKey]);

  useEffect(() => {
    if (!map || !ready) return;
    try {
      for (const l of [`${id}-fill`, `${id}-line`]) {
        if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', visible ? 'visible' : 'none');
      }
    } catch { /* ignore */ }
  }, [map, ready, visible]);

  const filterKey = JSON.stringify(filter);
  useEffect(() => {
    if (!map || !ready) return;
    try {
      for (const l of [`${id}-fill`, `${id}-line`]) {
        if (map.getLayer(l)) map.setFilter(l, filter);
      }
    } catch { /* ignore */ }
  }, [map, ready, filterKey]);

  const paintKey = JSON.stringify([fill, line]);
  useEffect(() => {
    if (!map || !ready) return;
    try {
      if (map.getLayer(`${id}-fill`)) Object.entries(fill).forEach(([k, v]) => map.setPaintProperty(`${id}-fill`, k, v));
      if (map.getLayer(`${id}-line`)) Object.entries(line).forEach(([k, v]) => map.setPaintProperty(`${id}-line`, k, v));
    } catch { /* ignore */ }
  }, [map, ready, paintKey]);
}

// GeoJSON downloads are shared and kept for the session, so returning to the map is instant
const jsonCache = new Map();
const loadJson = url => () => {
  if (!jsonCache.has(url)) {
    jsonCache.set(url, fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch(e => { jsonCache.delete(url); throw e; }));
  }
  return jsonCache.get(url);
};

// Filter on the values whose legend entry is not hidden (hidden holds the same values)
const inFilter = (property, all, hidden, valueOf) => {
  const shown = all.map(valueOf).filter(v => !hidden.has(v));
  return shown.length === all.length ? null : ['in', ['get', property], ['literal', shown]];
};

// ── Layers ───────────────────────────────────────────────────────────────────

export function ZoningLayer({ visible, hiddenZones, faded }) {
  useOverlay({
    id: 'zoning',
    load: loadJson('/data/zoning_2020.geojson'),
    visible,
    filter: inFilter('zone', ZONING_LEGEND, hiddenZones, z => z.id),
    fill: { 'fill-color': ZONING_COLOR, 'fill-opacity': faded ? 0.18 : 0.5 },
    line: { 'line-color': ZONING_COLOR, 'line-width': 0.6, 'line-opacity': faded ? 0.35 : 0.9 },
  });
  return null;
}

export function FloodLayer({ visible, hiddenFlood }) {
  useOverlay({
    id: 'flood',
    load: loadJson('/data/flood_hazard_2020.geojson'),
    visible,
    filter: inFilter('hazard', FLOOD_LEGEND, hiddenFlood, l => l.val),
    beforeAdd: map => FLOOD_LEGEND.forEach(l => ensureHatch(map, hatchName('flood', l.val), l.hex, false)),
    fill: { 'fill-pattern': ['match', ['get', 'hazard'], ...FLOOD_LEGEND.flatMap(l => [l.val, hatchName('flood', l.val)]), hatchName('flood', 'Moderate')] },
    line: { 'line-color': ['match', ['get', 'hazard'], ...FLOOD_LEGEND.flatMap(l => [l.val, l.hex]), '#6baed6'], 'line-width': 1.2, 'line-opacity': 0.9 },
  });
  return null;
}

export function LandslideLayer({ visible, hiddenLandslide }) {
  useOverlay({
    id: 'landslide',
    load: loadJson('/data/landslide_hazard_2020.geojson'),
    visible,
    filter: inFilter('hazard', LANDSLIDE_LEGEND, hiddenLandslide, l => l.val),
    beforeAdd: map => LANDSLIDE_LEGEND.forEach(l => ensureHatch(map, hatchName('landslide', l.val), l.hex, true)),
    fill: { 'fill-pattern': ['match', ['get', 'hazard'], ...LANDSLIDE_LEGEND.flatMap(l => [l.val, hatchName('landslide', l.val)]), hatchName('landslide', 'Moderate')] },
    line: { 'line-color': ['match', ['get', 'hazard'], ...LANDSLIDE_LEGEND.flatMap(l => [l.val, l.hex]), '#c58f4e'], 'line-width': 1.2, 'line-opacity': 0.9 },
  });
  return null;
}

// Barangay boundaries coloured by their stored suitability level for one land use
export function SuitabilityLayer({ visible, use, hiddenLevels }) {
  useOverlay({
    id: 'suitability',
    loadKey: use,
    load: () => Promise.all([loadJson('/data/panabo_barangays.geojson')(), fetchSuitabilitySummary()])
      .then(([boundaries, summary]) => {
        const byName = Object.fromEntries(summary.map(z => [normalizeName(z.unit_name), z]));
        return {
          type: 'FeatureCollection',
          features: boundaries.features
            .map(f => {
              const zone = byName[normalizeName(f.properties.name)];
              const result = zone?.scores?.[use];
              return result ? { ...f, properties: { name: zone.unit_name, level: result.level, pct: result.pct } } : null;
            })
            .filter(Boolean),
        };
      }),
    visible,
    filter: inFilter('level', SUITABILITY_LEGEND, hiddenLevels, l => l.label),
    fill: { 'fill-color': ['match', ['get', 'level'], ...SUITABILITY_LEGEND.flatMap(l => [l.label, l.hex]), '#9ca3af'], 'fill-opacity': 0.55 },
    line: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-opacity': 0.9 },
  });
  return null;
}

// Outline of the barangays returned by a zoning query, drawn above every other overlay
export function QueryBarangayLayer({ names }) {
  const keys = names.map(normalizeName);
  useOverlay({
    id: 'query',
    load: () => loadJson('/data/panabo_barangays.geojson')().then(boundaries => ({
      type: 'FeatureCollection',
      features: boundaries.features.map(f => ({ ...f, properties: { ...f.properties, key: normalizeName(f.properties.name) } })),
    })),
    visible: keys.length > 0,
    filter: ['in', ['get', 'key'], ['literal', keys]],
    fill: { 'fill-color': '#db2777', 'fill-opacity': 0.06 },
    line: { 'line-color': '#db2777', 'line-width': 2.4, 'line-opacity': 0.9, 'line-dasharray': [2, 1] },
  });
  return null;
}
