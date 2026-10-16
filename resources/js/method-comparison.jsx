import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Badge } from './components.jsx';

const METHOD_NOTES = {
  ahp_wlc:    'Expert weights · weighted sum',
  ahp_topsis: 'Expert weights · distance to ideal',
  ewm_wlc:    'Entropy weights · weighted sum',
  ewm_topsis: 'Entropy weights · distance to ideal',
};

function rhoVariant(rho) {
  if (rho >= 0.7) return 'brand';
  if (rho >= 0.4) return 'warn';
  return 'destructive';
}

function rhoLabel(rho) {
  if (rho >= 0.7) return 'strong';
  if (rho >= 0.4) return 'moderate';
  if (rho >= 0)   return 'weak';
  return 'opposite';
}

function Summary({ methods, agreement }) {
  const others = Object.keys(methods).filter(k => k !== 'ahp_wlc');
  const sorted = [...others].sort((a, b) => agreement.spearman.ahp_wlc[b] - agreement.spearman.ahp_wlc[a]);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const rho = k => agreement.spearman.ahp_wlc[k].toFixed(2);

  return (
    <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
      Compared with the baseline <b>AHP-WLC</b>, <b>{methods[best]}</b> agrees most
      (ρ = {rho(best)}, {rhoLabel(agreement.spearman.ahp_wlc[best])}; {agreement.top5_overlap[best]}/5 shared top sites)
      and <b>{methods[worst]}</b> least (ρ = {rho(worst)}, {rhoLabel(agreement.spearman.ahp_wlc[worst])}).
      Methods that share the same weights but differ in aggregation isolate the effect of WLC vs. TOPSIS;
      methods that share aggregation but differ in weights isolate AHP vs. EWM.
    </p>
  );
}

export function MethodComparison({ analysisType, typeLabel }) {
  const [data, setData]       = useState(null);
  const [methods, setMethods] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/suitability/compare?analysis_type=${analysisType}`, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { if (active) { setData(json.data); setMethods(json.methods); } })
      .catch(e => { if (active) setError(`Could not load method comparison (${e.message}).`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [analysisType]);

  const keys = Object.keys(methods);

  return (
    <Card style={{ marginTop: 20 }}>
      <CardHeader>
        <div className="row-between">
          <span className="card-title">Method Comparison — {typeLabel}</span>
          {data && <Badge variant="brand">{keys.length} methods · {data.agreement.eligible_units} eligible zones</Badge>}
        </div>
      </CardHeader>

      {error ? (
        <CardBody><div style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</div></CardBody>
      ) : loading || !data ? (
        <CardBody><div className="muted" style={{ fontSize: 13 }}>Running AHP-WLC, AHP-TOPSIS, EWM-WLC and EWM-TOPSIS…</div></CardBody>
      ) : (
        <>
          <CardBody>
            <Summary methods={methods} agreement={data.agreement}/>
          </CardBody>

          <div className="grid grid-2" style={{ gap: 0, borderTop: '1px solid hsl(var(--border))' }}>
            {/* Weights: AHP vs EWM */}
            <div style={{ overflowX: 'auto', borderRight: '1px solid hsl(var(--border))' }}>
              <table className="table">
                <thead>
                  <tr><th>Criterion</th><th>AHP weight</th><th>EWM weight</th></tr>
                </thead>
                <tbody>
                  {data.criteria.map(c => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{(data.weights.ahp[c] * 100).toFixed(1)}%</td>
                      <td className="mono" style={{ fontSize: 12 }}>{(data.weights.ewm[c] * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Spearman rank correlation matrix */}
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Spearman ρ</th>
                    {keys.map(k => <th key={k} style={{ fontSize: 11 }}>{methods[k]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {keys.map(a => (
                    <tr key={a}>
                      <td style={{ fontWeight: 500, fontSize: 12 }} title={METHOD_NOTES[a]}>{methods[a]}</td>
                      {keys.map(b => (
                        <td key={b}>
                          {a === b
                            ? <span className="muted mono" style={{ fontSize: 12 }}>1.00</span>
                            : <Badge variant={rhoVariant(data.agreement.spearman[a][b])}>{data.agreement.spearman[a][b].toFixed(2)}</Badge>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="muted" style={{ fontSize: 11.5 }}>Top-5 shared with AHP-WLC</td>
                    {keys.map(k => <td key={k} className="mono" style={{ fontSize: 12 }}>{data.agreement.top5_overlap[k]}/5</td>)}
                  </tr>
                  <tr>
                    <td className="muted" style={{ fontSize: 11.5 }}>Mean rank shift vs AHP-WLC</td>
                    {keys.map(k => <td key={k} className="mono" style={{ fontSize: 12 }}>{data.agreement.mean_rank_shift[k]}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rankings side by side */}
          <div style={{ overflowX: 'auto', borderTop: '1px solid hsl(var(--border))' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Barangay</th>
                  <th>Usable area</th>
                  {keys.map(k => <th key={k} title={METHOD_NOTES[k]}>{methods[k]}<div className="muted" style={{ fontSize: 10, fontWeight: 400 }}>rank · score</div></th>)}
                </tr>
              </thead>
              <tbody>
                {data.units.map(u => (
                  <tr key={u.zone_unit_id} style={{ opacity: u.excluded ? 0.55 : 1 }}>
                    <td style={{ fontWeight: 500 }}>{u.unit_name}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{u.available_area_ha != null ? `${u.available_area_ha} ha` : '—'}</td>
                    {u.excluded ? (
                      <td colSpan={keys.length} style={{ fontSize: 12 }}>
                        <Badge variant="destructive">Excluded</Badge>
                        <span className="muted" style={{ marginLeft: 8 }}>{u.exclusion_reason}</span>
                      </td>
                    ) : keys.map(k => (
                      <td key={k}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>#{u.methods[k].rank}</span>
                        <span className="muted mono" style={{ fontSize: 11, marginLeft: 6 }}>{u.methods[k].score.toFixed(3)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CardBody>
            <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
              All methods use the same criterion scores and the same CLUP constraint step. TOPSIS closeness is relative to the
              best and worst zones in this set, so compare TOPSIS methods by rank, not by score level.
            </p>
          </CardBody>
        </>
      )}
    </Card>
  );
}
