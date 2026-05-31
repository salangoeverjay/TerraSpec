import React, { useState, useEffect } from 'react';
import { Btn, Card, CardHeader, CardBody, Badge } from './components.jsx';

const HAZARD_META = {
  has_flood:          { label: 'Flood',       variant: 'destructive' },
  has_landslide:      { label: 'Landslide',   variant: 'warn' },
  has_storm_surge:    { label: 'Storm Surge', variant: 'destructive' },
  has_drought:        { label: 'Drought',     variant: 'warn' },
  has_sea_level_rise: { label: 'Sea Level Rise', variant: '' },
};

const TYPE_VARIANT = {
  Mangrove:  'brand',
  Watershed: 'brand',
  SAFDZ:     'warn',
};

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
    fetch('/environmental/summary')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Could not load environmental data.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label:   'High Flood Risk',
      value:   data?.flood_risk_count ?? 0,
      sub:     'Zones with High flood susceptibility (CLUP Table PF-19)',
      icon:    '⚠',
      color:   'hsl(var(--destructive))',
    },
    {
      label:   'Restricted Zones',
      value:   data?.restricted_count ?? 0,
      sub:     'Zones under active environmental restriction',
      icon:    '⛔',
      color:   'hsl(var(--warn, 38 92% 50%))',
    },
    {
      label:   'Protected Zones',
      value:   data?.protected_count ?? 0,
      sub:     'Mangrove + Watershed protected areas',
      icon:    '🌿',
      color:   'hsl(var(--brand))',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Environmental Analysis</h1>
          <p className="page-subtitle">Restrictions, flood risk, and protected area overlays for Panabo City</p>
        </div>
        <Btn variant="outline" icon="download" disabled={loading || exporting} onClick={exportReport}>
          {exporting ? 'Generating…' : 'Export Report'}
        </Btn>
      </div>

      {/* Stat cards */}
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        {stats.map(s => (
          <Card key={s.label}>
            <CardBody>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <span className="muted" style={{ fontSize: 12.5 }}>{s.label}</span>
                <span style={{ fontSize: 16, color: s.color }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700 }}>
                {loading ? <span className="muted">—</span> : s.value}
              </div>
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

      <div className="grid grid-2" style={{ marginBottom: 20 }}>

        {/* Environmental Restrictions — from DB */}
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Environmental Restrictions</span>
              {!loading && data && <Badge variant="brand">{data.restrictions.length} active</Badge>}
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '20px 18px', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading…</div>
            ) : (data?.restrictions ?? []).map((r, i, arr) => (
              <div
                key={r.restriction_id}
                style={{ padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
              >
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <Badge variant={TYPE_VARIANT[r.restriction_type] ?? ''}>{r.restriction_type}</Badge>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.restriction_name}</span>
                  </div>
                  <span className="muted mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {r.zone_count} zone{r.zone_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>{r.description}</div>
                <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {(r.zones ?? []).map(z => (
                    <span
                      key={z}
                      style={{
                        fontSize: 11, padding: '1px 7px',
                        background: 'hsl(var(--muted))', borderRadius: 4,
                        color: 'hsl(var(--foreground))',
                      }}
                    >{z}</span>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Restricted Zones — hazard flags per barangay */}
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Restricted Zones</span>
              {!loading && data && (
                <Badge variant="warn">{data.hazard_zones.length} zones flagged</Badge>
              )}
            </div>
          </CardHeader>
          <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px 18px', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading…</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Barangay</th>
                    <th>Type</th>
                    <th>Hazard Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.hazard_zones ?? []).map(z => (
                    <tr key={z.zone_unit_id}>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{z.unit_name}</td>
                      <td>
                        <Badge variant={z.unit_type === 'Urban' ? 'brand' : ''}>{z.unit_type}</Badge>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                          {Object.entries(HAZARD_META).map(([key, meta]) =>
                            z[key] ? (
                              <Badge key={key} variant={meta.variant}>{meta.label}</Badge>
                            ) : null
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

      </div>

      {/* Flood Risk Zones detail */}
      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title">Flood Risk Zones — High Susceptibility Area</span>
            {!loading && data && (
              <Badge variant="destructive">{data.flood_zones.length} zones · High flood_ha &gt; 0</Badge>
            )}
          </div>
        </CardHeader>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px 18px', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading…</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Barangay</th>
                  <th>Type</th>
                  <th>High Flood Area (ha)</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {(data?.flood_zones ?? []).map((z, i) => (
                  <tr key={z.zone_unit_id}>
                    <td><span className="muted mono">{i + 1}</span></td>
                    <td style={{ fontWeight: 500 }}>{z.unit_name}</td>
                    <td>
                      <Badge variant={z.unit_type === 'Urban' ? 'brand' : ''}>{z.unit_type}</Badge>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 13 }}>{z.flood_high_ha.toFixed(2)} ha</span>
                    </td>
                    <td>
                      <Badge variant={z.flood_high_ha >= 100 ? 'destructive' : 'warn'}>
                        {z.flood_high_ha >= 100 ? 'Critical' : 'Elevated'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

    </div>
  );
}
