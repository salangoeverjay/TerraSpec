import React, { useState, useMemo } from 'react';
import { PANABO } from './data.js';
import { Btn, Card, CardHeader, CardBody, Badge, ScoreRing } from './components.jsx';

export function SuitabilityScreen() {
  const [profile, setProfile] = useState('balanced');
  const [weights, setWeights] = useState({ soil: 0.25, water: 0.20, road: 0.20, slope: 0.15, flood: 0.10, landUse: 0.10 });

  const profiles = {
    balanced:     { soil: 0.25, water: 0.20, road: 0.20, slope: 0.15, flood: 0.10, landUse: 0.10 },
    residential:  { soil: 0.30, water: 0.25, road: 0.25, slope: 0.10, flood: 0.05, landUse: 0.05 },
    commercial:   { soil: 0.15, water: 0.15, road: 0.40, slope: 0.10, flood: 0.10, landUse: 0.10 },
    industrial:   { soil: 0.20, water: 0.20, road: 0.35, slope: 0.10, flood: 0.05, landUse: 0.10 },
    conservation: { soil: 0.10, water: 0.15, road: 0.05, slope: 0.20, flood: 0.30, landUse: 0.20 },
  };

  const factorScores = useMemo(() => ({ soil: 0.80, water: 0.70, road: 0.60, slope: 0.90, flood: 0.95, landUse: 0.70 }), []);
  const score = useMemo(() => {
    const w = weights, f = factorScores;
    return Math.round((w.soil*f.soil + w.water*f.water + w.road*f.road + w.slope*f.slope + w.flood*f.flood + w.landUse*f.landUse) * 100);
  }, [weights, factorScores]);

  const sorted = [...PANABO.barangayRankings].sort((a, b) => b.score - a.score);

  function applyProfile(name) {
    setProfile(name);
    setWeights(profiles[name]);
  }

  const criteriaLabels = { soil: 'Soil Quality', water: 'Water Access', road: 'Road Proximity', slope: 'Slope', flood: 'Flood Risk', landUse: 'Land Use Compat' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suitability Analysis</h1>
          <p className="page-subtitle">MCDA-based land suitability scoring for Panabo City parcels</p>
        </div>
        <Btn variant="outline" icon="download">Export PDF</Btn>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <Card style={{ gridColumn: '1 / 2' }}>
          <CardBody style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <ScoreRing value={score} size={100}/>
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Overall MCDA Score</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{score >= 75 ? 'Highly suitable' : score >= 50 ? 'Moderately suitable' : 'Not suitable'}</div>
            </div>
          </CardBody>
        </Card>

        <Card style={{ gridColumn: '2 / 4' }}>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">MCDA Weight Profile</span>
              <div className="tabs">
                {Object.keys(profiles).map(name => (
                  <div key={name} className={`tab${profile === name ? ' active' : ''}`} onClick={() => applyProfile(name)} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{name}</div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-3" style={{ gap: 10 }}>
              {Object.entries(weights).map(([k, w]) => (
                <div key={k}>
                  <div className="row-between" style={{ marginBottom: 5 }}>
                    <span style={{ fontSize: 12 }}>{criteriaLabels[k]}</span>
                    <span className="mono muted" style={{ fontSize: 11 }}>{Math.round(w * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={w}
                    onChange={e => setWeights(ws => ({ ...ws, [k]: parseFloat(e.target.value) }))}
                    className="range" style={{ marginBottom: 4 }}/>
                  <div className="meter">
                    <span style={{ width: `${Math.round((w * factorScores[k]) / Object.values(weights).reduce((a, b) => a + b, 1) * 100)}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title">Comparative Ranking</span>
            <Badge variant="brand">{PANABO.barangayRankings.length} barangays</Badge>
          </div>
        </CardHeader>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th><th>Barangay</th><th>Zone</th>
                <th>Score</th><th>Flood</th><th>Slope</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const zone = PANABO.zones.find(z => z.id === p.zone);
                return (
                  <tr key={p.id}>
                    <td><span className="muted mono">#{i+1}</span></td>
                    <td>{p.barangay}</td>
                    <td><span className="dot" style={{ background: zone?.hex, marginRight: 6 }}/>{p.zone}</td>
                    <td><Badge variant={p.score >= 75 ? 'brand' : p.score >= 50 ? 'warn' : 'destructive'}>{p.score}%</Badge></td>
                    <td><Badge variant={p.flood === 'Low' ? 'brand' : p.flood === 'Med' ? 'warn' : 'destructive'}>{p.flood}</Badge></td>
                    <td>{p.slope}</td>
                    <td>{p.flag ? <Badge variant="destructive">{p.flag}</Badge> : <Badge>clear</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
