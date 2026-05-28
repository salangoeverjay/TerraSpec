import React from 'react';
import { PANABO } from './data.js';
import { Icon, Btn, Card, CardHeader, CardBody, Badge, PanaboMapSVG } from './components.jsx';

export function EnvironmentalScreen() {
  const highRisk  = PANABO.parcels.filter(p => p.flood === 'High').length;
  const flaggedN  = PANABO.parcels.filter(p => p.flag).length;
  const protected_ = PANABO.parcels.filter(p => p.zone === 'P-1' || p.zone === 'M-1').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Environmental Analysis</h1>
          <p className="page-subtitle">Restrictions, flood risk, and protected area overlays for Panabo City</p>
        </div>
        <Btn variant="outline" icon="download">Export Report</Btn>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'High Flood Risk',  value: highRisk,   icon: 'alert',  variant: 'destructive', sub: 'Parcels with High flood susceptibility' },
          { label: 'Flagged Parcels',  value: flaggedN,   icon: 'shield', variant: 'warn',        sub: 'Env. ordinance violations' },
          { label: 'Protected Zones',  value: protected_, icon: 'leaf',   variant: 'brand',       sub: 'M-1 + P-1 classified areas' },
        ].map(s => (
          <Card key={s.label}>
            <CardBody>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <span className="muted" style={{ fontSize: 12.5 }}>{s.label}</span>
                <Icon name={s.icon} size={16} style={{ color: `hsl(var(--${s.variant === 'brand' ? 'brand' : 'destructive'}))` }}/>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{s.value}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{s.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <Card>
          <CardHeader><span className="card-title">Environmental Restrictions</span></CardHeader>
          <CardBody style={{ padding: 0 }}>
            {PANABO.restrictions.map((r, i) => (
              <div key={r.id} style={{ padding: '14px 18px', borderBottom: i < PANABO.restrictions.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div className="row-between" style={{ marginBottom: 5 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Badge variant={r.severity === 'high' ? 'destructive' : r.severity === 'medium' ? 'warn' : ''}>{r.severity}</Badge>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                  </div>
                  {r.zone && <Badge>{r.zone}</Badge>}
                </div>
                <div className="muted" style={{ fontSize: 12.5 }}>{r.description}</div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><span className="card-title">Flagged Parcels</span></CardHeader>
          <div style={{ padding: 14, height: 180, overflow: 'hidden' }}><PanaboMapSVG/></div>
          <CardBody style={{ padding: 0 }}>
            {PANABO.parcels.filter(p => p.flag || p.flood === 'High').map((p, i, arr) => (
              <div key={p.id} className="row-between" style={{ padding: '10px 18px', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.id}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{p.barangay}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {p.flag && <Badge variant="destructive">{p.flag}</Badge>}
                  {p.flood === 'High' && <Badge variant="warn">Flood: High</Badge>}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
