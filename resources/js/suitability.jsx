import React, { useState, useEffect } from 'react';
import { Btn, Card, CardHeader, CardBody, Badge, ScoreRing } from './components.jsx';

const ANALYSIS_TYPES = ['commercial', 'residential', 'industrial', 'reforestation'];

const TYPE_LABELS = {
  commercial:    'Commercial',
  residential:   'Residential',
  industrial:    'Industrial',
  agricultural:  'Agricultural',
  reforestation: 'Reforestation',
};

function levelVariant(level) {
  if (level === 'Highly Suitable')     return 'brand';
  if (level === 'Moderately Suitable') return 'warn';
  return 'destructive';
}

function scoreVariant(pct) {
  if (pct >= 75) return 'brand';
  if (pct >= 50) return 'warn';
  return 'destructive';
}

function CriteriaWeights({ weights }) {
  if (!weights) return null;
  return (
    <div className="grid grid-3" style={{ gap: 10 }}>
      {Object.entries(weights).map(([name, w]) => {
        const pct = Math.round(w * 100);
        return (
          <div key={name}>
            <div className="row-between" style={{ marginBottom: 5 }}>
              <span style={{ fontSize: 12 }}>{name}</span>
              <span className="mono muted" style={{ fontSize: 11 }}>{pct}%</span>
            </div>
            <div className="meter">
              <span style={{ width: `${pct}%` }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SuitabilityScreen() {
  const [analysisType, setAnalysisType] = useState('commercial');
  const [rankings, setRankings]         = useState([]);
  const [avgScore, setAvgScore]         = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/suitability/rankings?analysis_type=${analysisType}`)
      .then(r => r.json())
      .then(json => {
        setRankings(json.data ?? []);
        setAvgScore(json.avg_score ?? 0);
      })
      .catch(() => setError('Could not load rankings.'))
      .finally(() => setLoading(false));
  }, [analysisType]);

  const appliedWeights = rankings[0]?.applied_weights ?? null;
  const avgPct         = Math.round(avgScore);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suitability Analysis</h1>
          <p className="page-subtitle">AHP-WLC land suitability scoring · 40 zone units · Panabo City</p>
        </div>
        <Btn variant="outline" icon="download">Export PDF</Btn>
      </div>

      {/* Analysis type selector */}
      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        {ANALYSIS_TYPES.map(t => (
          <button
            key={t}
            className={`chip${analysisType === t ? ' active' : ''}`}
            style={{
              background: analysisType === t ? 'hsl(var(--brand))' : 'hsl(var(--background))',
              color:      analysisType === t ? 'white'              : 'hsl(var(--foreground))',
              fontWeight: analysisType === t ? 600 : 400,
              border:     '1px solid hsl(var(--border))',
              cursor: 'pointer',
            }}
            onClick={() => setAnalysisType(t)}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        {/* Score ring — average for selected type */}
        <Card style={{ gridColumn: '1 / 2' }}>
          <CardBody style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {loading
              ? <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'hsl(var(--muted))', flexShrink: 0 }}/>
              : <ScoreRing value={avgPct} size={100}/>
            }
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Avg Score · {TYPE_LABELS[analysisType]}</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {loading ? '—' : avgPct >= 75 ? 'Highly Suitable' : avgPct >= 50 ? 'Moderately Suitable' : 'Low Suitability'}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {loading ? '' : `${rankings.length} zones · avg ${avgScore}%`}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Criteria weights for selected type */}
        <Card style={{ gridColumn: '2 / 4' }}>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">AHP Criteria Weights · {TYPE_LABELS[analysisType]}</span>
              <Badge variant="brand">7 criteria</Badge>
            </div>
          </CardHeader>
          <CardBody>
            {loading || !appliedWeights
              ? <div className="muted" style={{ fontSize: 12.5 }}>Loading weights…</div>
              : <CriteriaWeights weights={appliedWeights}/>
            }
          </CardBody>
        </Card>
      </div>

      {/* Rankings table */}
      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title">Comparative Ranking — {TYPE_LABELS[analysisType]}</span>
            {!loading && <Badge variant="brand">{rankings.length} zone units</Badge>}
          </div>
        </CardHeader>
        <div style={{ overflowX: 'auto' }}>
          {error ? (
            <div style={{ padding: '24px 18px', color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</div>
          ) : loading ? (
            <div style={{ padding: '24px 18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading rankings…</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Barangay</th>
                  <th>Type</th>
                  <th>Total Score</th>
                  <th>Flood</th>
                  <th>Liquefaction</th>
                  <th>Slope</th>
                  <th>Soil</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map(row => (
                  <tr key={row.zone_unit_id}>
                    <td><span className="muted mono">#{row.rank}</span></td>
                    <td style={{ fontWeight: 500 }}>{row.unit_name}</td>
                    <td>
                      <Badge variant={row.unit_type === 'Urban' ? 'brand' : ''}>
                        {row.unit_type}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={scoreVariant(row.total_pct)}>{row.total_pct}%</Badge>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {Math.round(row.flood_score * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {Math.round(row.liquefaction_score * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {Math.round(row.slope_score * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {Math.round(row.soil_score * 100)}%
                      </span>
                    </td>
                    <td>
                      <Badge variant={levelVariant(row.suitability_level)}>
                        {row.suitability_level}
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
