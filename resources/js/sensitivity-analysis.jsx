import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Badge } from './components.jsx';

function areaVariant(pct) {
  if (pct < 5)  return 'brand';
  if (pct < 10) return 'warn';
  return 'destructive';
}

function stepLabel(step) {
  return `${step > 0 ? '+' : '−'}${Math.round(Math.abs(step) * 100)}%`;
}

function Verdict({ data }) {
  const at10 = data.max_area_changed_pct_at_10;
  const at20 = data.max_area_changed_pct;
  return (
    <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
      {data.robust_at_10
        ? <>The AHP-WLC result is <b>robust to ±10% weight changes</b>: at most {at10}% of the usable area ({data.total_area_ha} ha) changes suitability class. </>
        : <>The AHP-WLC result is <b>sensitive to ±10% weight changes</b>: up to {at10}% of the usable area changes suitability class. </>}
      {data.robust
        ? <>It also stays under 5% at ±20%. </>
        : <>At ±20%, up to {at20}% changes class{data.most_sensitive && <>, mostly driven by <b>{data.most_sensitive}</b></>}, so that weight needs the strongest justification. </>}
      Rankings stay stable (lowest Spearman ρ = {data.min_spearman.toFixed(3)}).
    </p>
  );
}

export function SensitivityAnalysis({ analysisType, typeLabel }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/suitability/sensitivity?analysis_type=${analysisType}`, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { if (active) setData(json.data); })
      .catch(e => { if (active) setError(`Could not load sensitivity analysis (${e.message}).`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [analysisType]);

  return (
    <Card style={{ marginTop: 20 }}>
      <CardHeader>
        <div className="row-between">
          <span className="card-title">Weight Sensitivity (AHP-WLC) — {typeLabel}</span>
          {data && (
            <Badge variant={data.robust_at_10 ? 'brand' : 'destructive'}>
              {data.robust_at_10 ? 'Robust at ±10%' : 'Sensitive at ±10%'}
            </Badge>
          )}
        </div>
      </CardHeader>

      {error ? (
        <CardBody><div style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</div></CardBody>
      ) : loading || !data ? (
        <CardBody><div className="muted" style={{ fontSize: 13 }}>Perturbing weights ±10% and ±20%…</div></CardBody>
      ) : (
        <>
          <CardBody>
            <Verdict data={data}/>
          </CardBody>

          <div style={{ overflowX: 'auto', borderTop: '1px solid hsl(var(--border))' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th>AHP weight</th>
                  {data.steps.map(s => (
                    <th key={s}>
                      {stepLabel(s)}
                      <div className="muted" style={{ fontSize: 10, fontWeight: 400 }}>area changed · zones · ρ</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.criteria.map(row => (
                  <tr key={row.criterion}>
                    <td style={{ fontWeight: 500 }}>{row.criterion}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{(row.base_weight * 100).toFixed(1)}%</td>
                    {row.results.map(cell => (
                      <td
                        key={cell.step}
                        title={cell.changed_units.length
                          ? `Weight → ${(cell.weight * 100).toFixed(1)}%. Class changes: ${cell.changed_units.join(', ')}`
                          : `Weight → ${(cell.weight * 100).toFixed(1)}%. No class changes.`}
                      >
                        <Badge variant={areaVariant(cell.area_changed_pct)}>{cell.area_changed_pct}%</Badge>
                        <span className="muted mono" style={{ fontSize: 11, marginLeft: 6 }}>
                          {cell.units_changed} · {cell.spearman.toFixed(2)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CardBody>
            <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
              One weight is changed at a time; the others are rescaled proportionally so all weights still sum to 100%.
              Area changed = share of the {data.total_area_ha} ha of usable land (after the CLUP constraint step) whose
              suitability class changes. Under 5% is considered robust. Hover a cell to see which zones change.
            </p>
          </CardBody>
        </>
      )}
    </Card>
  );
}
