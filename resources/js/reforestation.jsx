import React, { useState } from 'react';
import { PANABO } from './data.js';
import { Btn, Card, CardHeader, CardBody, Badge, PanaboMapSVG } from './components.jsx';

export function ReforestationScreen() {
  const [soil, setSoil] = useState('Silty clay / mudflat');
  const [elevation, setElevation] = useState('0–3 m');
  const [salinity, setSalinity] = useState('High');

  const filtered = PANABO.species.filter(s => {
    if (salinity && s.salinity !== salinity && salinity !== 'Any') return false;
    return true;
  }).sort((a, b) => b.score - a.score);

  const sites = PANABO.parcels.filter(p => p.zone === 'M-1' || p.zone === 'A-1' || p.zone === 'P-1');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reforestation Planning</h1>
          <p className="page-subtitle">Species suitability and site recommendations for Panabo City</p>
        </div>
        <Btn variant="outline" icon="download">Export Plan</Btn>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <Card>
          <CardHeader><span className="card-title">Site Parameters</span></CardHeader>
          <CardBody>
            <div className="stack" style={{ gap: 14 }}>
              {[
                { label: 'Soil type', value: soil, setter: setSoil, options: ['Silty clay / mudflat','Sandy / muddy','Alluvial / brackish','Sandy loam / upland','Well-drained loam','Clay / loam','Deep loam / clay'] },
                { label: 'Elevation', value: elevation, setter: setElevation, options: ['0–3 m','0–2 m','0–4 m','5–200 m','0–600 m','100–500 m','0–400 m'] },
                { label: 'Salinity', value: salinity, setter: setSalinity, options: ['Any','High','Med','Low','None'] },
              ].map(f => (
                <div key={f.label}>
                  <label className="label">{f.label}</label>
                  <select className="input" value={f.value} onChange={e => f.setter(e.target.value)}>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><span className="card-title">Recommended Sites</span></CardHeader>
          <div style={{ height: 180, overflow: 'hidden' }}><PanaboMapSVG/></div>
          <CardBody style={{ padding: 0 }}>
            {sites.slice(0, 3).map((p, i) => (
              <div key={p.id} className="row-between" style={{ padding: '9px 18px', borderBottom: i < 2 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.id}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{p.barangay} · {p.zone}</div>
                </div>
                <Badge variant="brand">{p.score}%</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title">Ranked Species</span>
            <Badge variant="brand">{filtered.length} species matched</Badge>
          </div>
        </CardHeader>
        <div className="grid grid-3" style={{ padding: 18, gap: 14 }}>
          {filtered.map((s, i) => (
            <Card key={s.id} style={{ background: 'hsl(var(--muted) / 0.3)' }}>
              <CardBody>
                <div className="row-between" style={{ marginBottom: 10 }}>
                  <span className="muted" style={{ fontSize: 11 }}>#{i+1}</span>
                  <Badge variant={s.score >= 80 ? 'brand' : s.score >= 65 ? 'warn' : ''}>{s.score}%</Badge>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{s.name.split(' (')[0]}</div>
                <div className="muted" style={{ fontSize: 11.5, fontStyle: 'italic', marginBottom: 8 }}>({s.name.match(/\(([^)]+)\)/)?.[1] || ''})</div>
                <div className="stack" style={{ gap: 4 }}>
                  {[['Soil', s.soil],['Elev.', s.elevation],['Salinity', s.salinity],['Temp', s.temp]].map(([k, v]) => (
                    <div key={k} className="row-between" style={{ fontSize: 11.5 }}>
                      <span className="muted">{k}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.4 }}>{s.notes}</div>
              </CardBody>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
