import React, { useEffect, useState } from 'react';
import { getJson } from './http.js';
import { ZONING_LEGEND, loadBarangayBoundaries, normalizeName } from './data.js';
import { Icon, Btn, Card, CardBody, Badge } from './components.jsx';

export const ZONING_QUERY_HAZARDS = {
  any: 'All land in the zone',
  flood: 'In very high flood areas',
  landslide: 'In high landslide areas',
  hazard_free: 'Outside very high flood & high landslide',
};

// One-click queries offered on the map
export const ZONING_QUERY_PRESETS = [
  { label: 'Residential', filters: { zones: ['GR', 'R-1'], hazard: 'any' } },
  { label: 'Commercial', filters: { zones: ['C', 'GC'], hazard: 'any' } },
  { label: 'Mangrove', filters: { zones: ['MG'], hazard: 'any' } },
  { label: 'Built-up zones in flood', filters: { zones: ['GR', 'R-1', 'C', 'GC', 'I', 'INS'], hazard: 'flood' } },
];

export const EMPTY_QUERY = { zones: [], barangays: [], hazard: 'any', minArea: '' };

const ha = value => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
const zoneHex = code => ZONING_LEGEND.find(z => z.id === code)?.hex ?? '#888888';

const label = { fontSize: 12, fontWeight: 500, color: 'hsl(var(--muted-foreground))', margin: '12px 0 6px' };

export async function runZoningQuery(filters) {
  const params = new URLSearchParams();
  filters.zones.forEach(z => params.append('zones[]', z));
  filters.barangays.forEach(b => params.append('barangays[]', b));
  params.set('hazard', filters.hazard);
  if (filters.minArea !== '') params.set('min_area_ha', filters.minArea);

  const response = await fetch(`/zoning/query?${params}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).data;
}

/** Bounding box [[w, s], [e, n]] of the named barangays (PSA boundaries), or null. */
export async function barangayBounds(names) {
  const wanted = new Set(names.map(normalizeName));
  const boundaries = await loadBarangayBoundaries();
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const f of boundaries.features) {
    if (!wanted.has(normalizeName(f.properties.name))) continue;
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const [lng, lat] of polygons.flat(2)) {
      w = Math.min(w, lng); e = Math.max(e, lng); s = Math.min(s, lat); n = Math.max(n, lat);
    }
  }
  return Number.isFinite(w) ? [[w, s], [e, n]] : null;
}

function downloadCsv(result) {
  const header = ['Barangay', 'Zone code', 'Zone', 'Zone area (ha)', 'Very high flood (ha)', 'High landslide (ha)', 'Matched (ha)'];
  const lines = result.rows.map(r => [r.barangay, r.zone, r.zone_label, r.zone_area_ha, r.flood_very_high_ha, r.landslide_high_ha, r.matched_ha]);
  const csv = [
    [`Zoning query: ${result.filters.hazard_label}`],
    [`Source: ${result.source}`],
    header,
    ...lines,
    ['Total', '', '', '', '', '', result.total_ha],
  ].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = 'terraspec-zoning-query.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Zoning query panel: pick zoning classes, barangays and a hazard condition, then see the
 * matching hectares per zone and barangay. Results are drawn on the map by the parent.
 */
export function ZoningQueryPanel({ filters, setFilters, result, loading, error, onRun, onClear, onClose, onFocusBarangay }) {
  const [barangays, setBarangays] = useState([]);
  useEffect(() => {
    getJson('/barangays')
      .then(json => setBarangays(json.data ?? []))
      .catch(() => setBarangays([]));
  }, []);

  const toggleZone = code => setFilters(f => ({
    ...f, zones: f.zones.includes(code) ? f.zones.filter(z => z !== code) : [...f.zones, code],
  }));
  const addBarangay = id => id && setFilters(f => (f.barangays.includes(id) ? f : { ...f, barangays: [...f.barangays, id] }));
  const removeBarangay = id => setFilters(f => ({ ...f, barangays: f.barangays.filter(b => b !== id) }));
  const nameOf = id => barangays.find(b => b.zone_unit_id === id)?.unit_name ?? `#${id}`;
  const maxZone = result?.by_zone?.[0]?.matched_ha || 1;

  return (
    <Card style={{ boxShadow: 'var(--shadow-float)', display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
      <div className="row-between" style={{ padding: '10px 14px', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="filter" size={14} style={{ color: 'hsl(var(--muted-foreground))' }}/>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Zoning query</span>
        </div>
        <Btn variant="ghost" sz="sm" icon="x" onClick={onClose}/>
      </div>

      <CardBody style={{ padding: '4px 14px 14px', overflowY: 'auto' }}>
        <div style={label}>Zoning class {filters.zones.length === 0 && <span style={{ fontWeight: 400 }}>· all</span>}</div>
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          {ZONING_LEGEND.map(z => {
            const active = filters.zones.includes(z.id);
            return (
              <button key={z.id} onClick={() => toggleZone(z.id)} title={z.label} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, height: 26, padding: '0 8px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${active ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}`,
                background: active ? 'hsl(var(--foreground) / 0.06)' : 'hsl(var(--background))',
                color: 'hsl(var(--foreground))', fontWeight: 500,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: z.hex }}/>{z.id}
              </button>
            );
          })}
        </div>

        <div style={label}>Barangay {filters.barangays.length === 0 && <span style={{ fontWeight: 400 }}>· all 40</span>}</div>
        <select className="input" value="" onChange={e => addBarangay(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }}>
          <option value="">Add a barangay…</option>
          {barangays.filter(b => !filters.barangays.includes(b.zone_unit_id)).map(b => (
            <option key={b.zone_unit_id} value={b.zone_unit_id}>{b.unit_name}</option>
          ))}
        </select>
        {filters.barangays.length > 0 && (
          <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            {filters.barangays.map(id => (
              <button key={id} onClick={() => removeBarangay(id)} title="Remove" className="chip" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                {nameOf(id)} <Icon name="x" size={10}/>
              </button>
            ))}
          </div>
        )}

        <div style={label}>Hazard condition</div>
        <select className="input" value={filters.hazard} onChange={e => setFilters(f => ({ ...f, hazard: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12 }}>
          {Object.entries(ZONING_QUERY_HAZARDS).map(([k, text]) => <option key={k} value={k}>{text}</option>)}
        </select>

        <div style={label}>Minimum area per result</div>
        <div className="row" style={{ gap: 6 }}>
          <input className="input" type="number" min="0" step="0.5" placeholder="0" value={filters.minArea}
            onChange={e => setFilters(f => ({ ...f, minArea: e.target.value }))} style={{ flex: 1, fontSize: 12 }}/>
          <span className="muted" style={{ fontSize: 12 }}>ha</span>
        </div>

        <div className="row" style={{ gap: 6, marginTop: 12 }}>
          <Btn variant="primary" sz="sm" icon="search" onClick={onRun} disabled={loading} style={{ flex: 1 }}>{loading ? 'Querying…' : 'Run query'}</Btn>
          <Btn variant="outline" sz="sm" onClick={onClear}>Clear</Btn>
        </div>

        {error && <div style={{ marginTop: 10, fontSize: 12, color: 'hsl(var(--destructive))' }}>{error}</div>}

        {result && (
          <>
            <div className="separator" style={{ margin: '14px 0 10px' }}/>
            <div className="row-between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{ha(result.total_ha)}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{result.filters.hazard_label} · {result.barangay_count} barangay{result.barangay_count === 1 ? '' : 's'}</div>
              </div>
              {result.rows.length > 0 && <Btn variant="outline" sz="sm" icon="download" onClick={() => downloadCsv(result)}>CSV</Btn>}
            </div>

            {result.rows.length === 0 ? (
              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>No zoned land matches these filters.</div>
            ) : (
              <>
                <div style={label}>By zoning class</div>
                <div className="stack" style={{ gap: 5 }}>
                  {result.by_zone.map(z => (
                    <div key={z.zone}>
                      <div className="row-between" style={{ fontSize: 11.5 }}>
                        <span>{z.zone_label}</span>
                        <span className="mono">{ha(z.matched_ha)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'hsl(var(--muted))', overflow: 'hidden' }}>
                        <div style={{ width: `${(z.matched_ha / maxZone) * 100}%`, height: '100%', background: zoneHex(z.zone) }}/>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={label}>By barangay · click to zoom</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr className="muted" style={{ textAlign: 'left' }}>
                      <th style={{ fontWeight: 500, padding: '3px 0' }}>Barangay</th>
                      <th style={{ fontWeight: 500 }}>Zone</th>
                      <th style={{ fontWeight: 500, textAlign: 'right' }}>Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map(r => (
                      <tr key={`${r.zone_unit_id}-${r.zone}`} onClick={() => onFocusBarangay(r.barangay)} style={{ cursor: 'pointer', borderTop: '1px solid hsl(var(--border))' }}>
                        <td style={{ padding: '4px 0' }}>{r.barangay}</td>
                        <td><Badge style={{ fontSize: 10, background: `${zoneHex(r.zone)}33` }}>{r.zone}</Badge></td>
                        <td className="mono" style={{ textAlign: 'right' }}>{ha(r.matched_ha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {result.note && <div className="muted" style={{ fontSize: 10.5, marginTop: 8 }}>{result.note}</div>}
            <div className="muted" style={{ fontSize: 10.5, marginTop: 8, lineHeight: 1.4 }}>Source: {result.source}</div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
