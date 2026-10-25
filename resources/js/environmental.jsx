import React, { useState, useEffect } from 'react';
import { Btn, Card, CardHeader, CardBody, Badge, Icon } from './components.jsx';

const LEVEL_VARIANT = { protected: 'destructive', regulated: 'warn' };

const ha = v => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha`;
const num = v => (v > 0 ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—');

export function EnvironmentalScreen() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [exporting, setExporting] = useState(false);

  function exportReport() {
    setExporting(true);
    const link = document.createElement('a');
    link.href = '/environmental/report';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setExporting(false), 3000);
  }

  useEffect(() => {
    fetch('/environmental/summary', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Could not load environmental data.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'High Flood Susceptibility', value: data?.flood_risk_count, icon: 'alert', sub: 'Barangays with High flood area (CLUP Table PF-19)' },
    { label: 'Landslide Susceptibility',  value: data?.landslide_count,  icon: 'alert', sub: 'Barangays with high or moderate landslide area (MGB 2020 map)' },
    { label: 'Liquefaction (HSA)',         value: data?.liquefaction_count, icon: 'alert', sub: 'Barangays with highly susceptible area (CLUP Table PF-26)' },
    { label: 'Protected Barangays',       value: data?.protected_count,  icon: 'shield', sub: 'Mangrove, forest reserve or mangrove site restriction' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Environmental Analysis</h1>
          <p className="page-subtitle">Hazards, restrictions and watersheds per barangay from verified sources · Panabo City</p>
        </div>
        <Btn variant="outline" icon="download" disabled={loading || exporting} onClick={exportReport}>
          {exporting ? 'Generating…' : 'Export Report'}
        </Btn>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {stats.map(s => (
          <Card key={s.label}>
            <CardBody>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <span className="muted" style={{ fontSize: 12.5 }}>{s.label}</span>
                <Icon name={s.icon} size={16} style={{ color: 'hsl(var(--brand))' }}/>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{loading ? <span className="muted">—</span> : s.value}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{s.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, background: 'hsl(var(--destructive) / 0.08)', borderRadius: 8, color: 'hsl(var(--destructive))', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 20, alignItems: 'start' }}>
        {/* Restrictions built from the zoning map and the mangrove sites */}
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Environmental Restrictions</span>
              {data && <Badge variant="brand">{data.restricted_count} barangays restricted</Badge>}
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '20px 18px', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading…</div>
            ) : (data?.restrictions ?? []).map((r, i, arr) => (
              <div key={r.restriction_id} style={{ padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div className="row-between" style={{ marginBottom: 6, gap: 8 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <Badge variant={LEVEL_VARIANT[r.level] ?? ''}>{r.level}</Badge>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.restriction_name}</span>
                  </div>
                  <span className="muted mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{r.zone_count} barangay{r.zone_count !== 1 ? 's' : ''}</span>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>{r.description}</div>
                <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {(r.zones ?? []).map(z => (
                    <span key={z} style={{ fontSize: 11, padding: '1px 7px', background: 'hsl(var(--muted))', borderRadius: 4 }}>{z}</span>
                  ))}
                </div>
              </div>
            ))}
            {data && <div className="muted" style={{ fontSize: 11, padding: '10px 18px', borderTop: '1px solid hsl(var(--border))' }}>Source: {data.sources.restrictions}.</div>}
          </CardBody>
        </Card>

        {/* Hazard hectares per barangay */}
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Hazards by Barangay</span>
              <span className="muted" style={{ fontSize: 11.5 }}>hectares</span>
            </div>
          </CardHeader>
          <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px 18px', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading…</div>
            ) : (
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Barangay</th>
                    <th style={{ textAlign: 'right' }}>Flood (High)</th>
                    <th style={{ textAlign: 'right' }}>Flood (any)</th>
                    <th style={{ textAlign: 'right' }}>Landslide (High / Mod.)</th>
                    <th style={{ textAlign: 'right' }}>Liquefaction HSA</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.hazards ?? []).map(z => (
                    <tr key={z.zone_unit_id}>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{z.unit_name}</td>
                      <td className="mono" style={{ textAlign: 'right', color: z.flood_high_ha > 0 ? 'hsl(var(--destructive))' : undefined }}>{num(z.flood_high_ha)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{num(z.flood_any_ha)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{z.landslide_high_ha + z.landslide_moderate_ha > 0 ? `${num(z.landslide_high_ha)} / ${num(z.landslide_moderate_ha)}` : '—'}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{num(z.liquefaction_hsa_ha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {data && (
            <div className="muted" style={{ fontSize: 11, padding: '10px 18px', borderTop: '1px solid hsl(var(--border))', lineHeight: 1.5 }}>
              Flood: {data.sources.flood}. Landslide: {data.sources.landslide}. Liquefaction: {data.sources.liquefaction}. {data.not_loaded}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* High flood barangays */}
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">High Flood Susceptibility</span>
              {data && <Badge variant="destructive">{data.flood_zones.length} barangays</Badge>}
            </div>
          </CardHeader>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px 18px', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading…</div>
            ) : (
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr><th>#</th><th>Barangay</th><th>Type</th><th style={{ textAlign: 'right' }}>High flood area</th><th style={{ textAlign: 'right' }}>Share of barangay (PF-19)</th></tr>
                </thead>
                <tbody>
                  {(data?.flood_zones ?? []).map((z, i) => (
                    <tr key={z.zone_unit_id}>
                      <td className="muted mono">{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{z.unit_name}</td>
                      <td><Badge variant={z.unit_type === 'Urban' ? 'brand' : ''}>{z.unit_type}</Badge></td>
                      <td className="mono" style={{ textAlign: 'right' }}>{ha(z.flood_high_ha)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{(z.flood_high_share * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* CLUP sub-watersheds (information, not restrictions) */}
        <Card>
          <CardHeader><span className="card-title">Sub-Watersheds</span></CardHeader>
          <CardBody style={{ padding: 0 }}>
            {(data?.watersheds ?? []).map((w, i, arr) => (
              <div key={w.name} style={{ padding: '12px 18px', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</span>
                  <span className="muted mono" style={{ fontSize: 11.5 }}>{ha(w.area_ha)} · {w.share_pct}%</span>
                </div>
                <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {w.barangays.map(b => <span key={b} style={{ fontSize: 11, padding: '1px 7px', background: 'hsl(var(--muted))', borderRadius: 4 }}>{b}</span>)}
                </div>
              </div>
            ))}
            {data && <div className="muted" style={{ fontSize: 11, padding: '10px 18px', borderTop: '1px solid hsl(var(--border))' }}>Source: {data.sources.watersheds}. All 40 barangays lie in at least one sub-watershed; 13 lie in more than one.</div>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
