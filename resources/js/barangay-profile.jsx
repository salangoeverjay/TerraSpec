import React, { useState, useEffect, useMemo } from 'react';
import { Icon, Btn, Card, CardHeader, CardBody, Badge } from './components.jsx';
import { ZONING_LEGEND } from './data.js';
import { MANGROVE_LEGEND } from './map-layers.jsx';

const USE_LABELS = {
  commercial: 'Commercial', residential: 'Residential', industrial: 'Industrial',
  agricultural: 'Agricultural', reforestation: 'Reforestation',
};

const LEVEL_VARIANT = { 'Highly Suitable': 'brand', 'Moderately Suitable': 'warn' };

const HAZARD_COLORS = {
  flood:        { High: '#341648', Moderate: '#6b3e81', Low: '#c074f2', None: '#e5e7eb' },
  liquefaction: { 'High (HSA)': '#b91c1c', 'Moderate (MSA)': '#f97316', 'Low (LSA)': '#fcd34d', None: '#e5e7eb' },
  storm_surge:  { High: '#1e3a8a', Moderate: '#3b82f6', Low: '#93c5fd' },
};

const FLAG_LABELS = {
  flood: 'Flood', landslide: 'Landslide', storm_surge: 'Storm surge', drought: 'Drought', sea_level_rise: 'Sea level rise',
};

const ha = v => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
const pct = v => `${(v * 100).toFixed(1)}%`;

function StackedBar({ items, colorOf }) {
  return (
    <div style={{ display: 'flex', height: 12, borderRadius: 4, overflow: 'hidden', background: 'hsl(var(--muted))' }}>
      {items.filter(i => i.share > 0).map(i => (
        <div key={i.label ?? i.code} title={`${i.label}: ${pct(i.share)}`} style={{ width: `${i.share * 100}%`, background: colorOf(i) }}/>
      ))}
    </div>
  );
}

function HazardBlock({ title, data, colors }) {
  if (!data) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{title}</span>
        <span className="muted" style={{ fontSize: 11 }}>{data.total_ha > 0 ? ha(data.total_ha) : 'no area recorded'}</span>
      </div>
      {data.total_ha > 0 ? (
        <>
          <StackedBar items={data.classes} colorOf={c => colors[c.label] ?? '#9ca3af'}/>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            {data.classes.map(c => (
              <span key={c.label} className="row" style={{ gap: 5, fontSize: 11.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: colors[c.label] ?? '#9ca3af' }}/>
                {c.label} <span className="muted mono">{ha(c.area_ha)} · {pct(c.share)}</span>
              </span>
            ))}
          </div>
        </>
      ) : null}
      <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>Source: {data.source}</div>
    </div>
  );
}

export function BarangayProfileScreen({ go, barangay }) {
  const [list, setList]         = useState([]);
  const [filter, setFilter]     = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch('/barangays', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => {
        const rows = json.data ?? [];
        setList(rows);
        const initial = rows.find(b => b.unit_name === barangay) ?? rows[0];
        if (initial) setSelectedId(initial.zone_unit_id);
      })
      .catch(() => setError('Could not load barangays.'));
  }, [barangay]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/barangays/${selectedId}/profile`, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { if (active) setProfile(json.data); })
      .catch(e => { if (active) setError(`Could not load the profile (${e.message}).`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const shown = useMemo(
    () => list.filter(b => b.unit_name.toLowerCase().includes(filter.toLowerCase())),
    [list, filter],
  );
  const zoneColor = code => ZONING_LEGEND.find(z => z.id === code)?.hex ?? '#9ca3af';
  const p = profile;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Barangay Profiles</h1>
          <p className="page-subtitle">Zoning, hazards, restrictions and suitability per barangay · Panabo City</p>
        </div>
        {p && go && (
          <Btn variant="outline" icon="map" onClick={() => go('map', { barangay: p.unit_name })}>Show on map</Btn>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* Barangay list */}
        <Card>
          <CardBody style={{ padding: 10 }}>
            <input className="input" placeholder="Search barangay…" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }}/>
            <div style={{ maxHeight: 620, overflowY: 'auto' }}>
              {shown.map(b => (
                <div
                  key={b.zone_unit_id}
                  onClick={() => setSelectedId(b.zone_unit_id)}
                  className="row-between"
                  style={{
                    padding: '7px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5,
                    background: b.zone_unit_id === selectedId ? 'hsl(var(--brand) / 0.12)' : 'transparent',
                    fontWeight: b.zone_unit_id === selectedId ? 600 : 400,
                  }}
                >
                  <span>{b.unit_name}</span>
                  <span className="muted" style={{ fontSize: 10.5 }}>{b.unit_type}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {error && <Card><CardBody><div style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</div></CardBody></Card>}
          {loading && !p && <Card><CardBody><div className="muted" style={{ fontSize: 13 }}>Loading profile…</div></CardBody></Card>}
          {p && (
            <>
              {/* Overview */}
              <Card style={{ opacity: loading ? 0.6 : 1 }}>
                <CardHeader>
                  <div className="row-between">
                    <span className="card-title">{p.unit_name}</span>
                    <div className="row" style={{ gap: 6 }}>
                      <Badge variant={p.overview.unit_type === 'Urban' ? 'brand' : ''}>{p.overview.unit_type}</Badge>
                      <Badge>{p.overview.settlement_tier?.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-4" style={{ gap: 12 }}>
                    {[
                      ['Area (CLUP)', ha(p.overview.total_area_ha)],
                      ['Population 2020', p.overview.population_2020?.toLocaleString()],
                      ['Households', p.overview.household_count?.toLocaleString()],
                      ['Land capability', `Class ${p.overview.land_capability_class ?? '—'}`],
                      ['Dominant soil', p.overview.dominant_soil_type ?? '—'],
                      ['Dominant slope', `${p.overview.dominant_slope_class ?? '—'}%`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="muted" style={{ fontSize: 11 }}>{k}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
                {/* Zoning */}
                <Card>
                  <CardHeader>
                    <div className="row-between">
                      <span className="card-title">Zoning</span>
                      <span className="muted" style={{ fontSize: 11 }}>{ha(p.zoning.zoned_area_ha)} zoned</span>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <StackedBar items={p.zoning.classes} colorOf={c => zoneColor(c.code)}/>
                    <table className="table" style={{ fontSize: 12, marginTop: 10 }}>
                      <thead>
                        <tr><th>Zoning class</th><th style={{ textAlign: 'right' }}>Area</th><th style={{ textAlign: 'right' }}>Share</th></tr>
                      </thead>
                      <tbody>
                        {p.zoning.classes.map(c => (
                          <tr key={c.code}>
                            <td>
                              <span className="row" style={{ gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: zoneColor(c.code), flexShrink: 0 }}/>
                                {ZONING_LEGEND.find(z => z.id === c.code)?.label ?? c.label}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right' }}>{ha(c.area_ha)}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{pct(c.share)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p.zoning.unzoned_area_ha > 0 && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                        {ha(p.zoning.unzoned_area_ha)} of the PSA barangay boundary lies outside the zoning map's city outline.
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>Source: {p.zoning.source}</div>
                  </CardBody>
                </Card>

                {/* Hazards */}
                <Card>
                  <CardHeader>
                    <div className="row-between">
                      <span className="card-title">Hazards</span>
                      <Icon name="alert" size={14} style={{ color: 'hsl(var(--destructive))' }}/>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {p.hazards ? (
                      <>
                        <HazardBlock title="Flood susceptibility" data={p.hazards.flood} colors={HAZARD_COLORS.flood}/>
                        <HazardBlock title="Liquefaction susceptibility" data={p.hazards.liquefaction} colors={HAZARD_COLORS.liquefaction}/>
                        <HazardBlock title="Storm surge" data={p.hazards.storm_surge} colors={HAZARD_COLORS.storm_surge}/>
                        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Hazard flags</div>
                        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          {Object.entries(FLAG_LABELS).map(([k, label]) => (
                            <Badge key={k} variant={p.hazards.flags[k] ? 'destructive' : ''}>
                              {p.hazards.flags[k] ? '⚠ ' : ''}{label}
                            </Badge>
                          ))}
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>
                          Mapped within zoned land (digitized MGB 2020 maps): {ha(p.zoning.mapped_flood_very_high_ha)} very-high flood ·{' '}
                          {ha(p.zoning.mapped_landslide_high_ha)} high landslide.
                        </div>
                      </>
                    ) : <div className="muted" style={{ fontSize: 12.5 }}>No hazard data recorded.</div>}
                  </CardBody>
                </Card>
              </div>

              <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
                {/* Suitability and constraints */}
                <Card>
                  <CardHeader><span className="card-title">Suitability by land use (AHP-WLC)</span></CardHeader>
                  <CardBody>
                    <table className="table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr><th>Land use</th><th style={{ textAlign: 'right' }}>Score</th><th>Level</th><th>Usable land</th></tr>
                      </thead>
                      <tbody>
                        {Object.entries(USE_LABELS).map(([k, label]) => {
                          const s = p.suitability[k];
                          if (s.outside_study_area) {
                            return (
                              <tr key={k}>
                                <td>{label}</td>
                                <td colSpan={3} className="muted" style={{ fontSize: 11.5 }} title={s.note}>Not assessed: outside the reforestation study area</td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={k}>
                              <td>{label}</td>
                              <td className="mono" style={{ textAlign: 'right' }}>{s.pct}%</td>
                              <td><Badge variant={LEVEL_VARIANT[s.level] ?? 'destructive'}>{s.level}</Badge></td>
                              <td className="muted" style={{ fontSize: 11.5 }}>
                                {s.excluded
                                  ? `Excluded: ${s.main_constraint}`
                                  : s.available_area_ha != null ? ha(s.available_area_ha) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardBody>
                </Card>

                {/* Restrictions and soil */}
                <Card>
                  <CardHeader><span className="card-title">Restrictions and soil</span></CardHeader>
                  <CardBody>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Environmental restrictions</div>
                    {p.restrictions.length > 0 ? p.restrictions.map(r => (
                      <div key={r.name} style={{ marginBottom: 8 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <Badge variant="destructive">{r.type}</Badge>
                          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{r.name}</span>
                        </div>
                        {r.description && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{r.description}</div>}
                      </div>
                    )) : <div className="muted" style={{ fontSize: 12 }}>None recorded for this barangay.</div>}

                    <div style={{ fontSize: 12.5, fontWeight: 600, margin: '12px 0 6px' }}>Soil types (CLUP Table PF-9, BSWM)</div>
                    {p.soil.length > 0 ? p.soil.map(s => (
                      <div key={s.soil} className="row-between" style={{ fontSize: 12 }}>
                        <span>{s.soil}</span><span className="mono muted">{ha(s.area_ha)}</span>
                      </div>
                    )) : <div className="muted" style={{ fontSize: 12 }}>No soil data recorded.</div>}
                  </CardBody>
                </Card>
              </div>

              {p.reforestation_sites?.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="row-between" style={{ width: '100%' }}>
                      <span className="card-title">Mangrove reforestation sites</span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {p.reforestation_sites.length} sites · {ha(p.reforestation_sites.reduce((sum, s) => sum + s.area_ha, 0))}
                      </span>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <table className="table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr><th>Site</th><th>Status</th><th>Year / adopter</th><th style={{ textAlign: 'right' }}>Area</th><th style={{ textAlign: 'right' }}>In Mangrove sub-zone</th></tr>
                      </thead>
                      <tbody>
                        {p.reforestation_sites.map(s => {
                          const status = MANGROVE_LEGEND.find(l => l.val === s.status);
                          return (
                            <tr key={s.name}>
                              <td>{s.name}</td>
                              <td>
                                <span className="row" style={{ gap: 6 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: 2, background: status?.hex, flexShrink: 0 }}/>
                                  {status?.label.replace(/ \(.*\)/, '') ?? s.status}
                                </span>
                              </td>
                              <td className="muted">{s.year ?? s.adopter ?? '—'}</td>
                              <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{ha(s.area_ha)}</td>
                              <td className="mono" style={{ textAlign: 'right' }}>{Math.round(s.mangrove_zone_share * 100)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      Source: Mangrove Reforestation and Rehabilitation (KML). Most sites lie seaward of the PSA barangay boundary, on intertidal flats, and are listed under the nearest barangay.
                    </div>
                  </CardBody>
                </Card>
              )}

              <div className="muted" style={{ fontSize: 11 }}>
                Area figures differ by source: the CLUP population table, each CLUP hazard table and the PSA barangay boundary
                each report their own total for the barangay.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
