import React, { useState, useEffect } from 'react';

const LEVEL_COLOR = {
  'Highly Suitable': 'hsl(var(--brand))',
  'Moderately Suitable': 'hsl(38 92% 50%)',
  'Low Suitability': 'hsl(var(--destructive))',
  'Not Suitable': 'hsl(var(--destructive))',
};

// How one barangay's AHP-WLC score is built: criterion score × AHP weight = contribution.
export function ScoreBreakdown({ zoneUnitId, analysisType }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/suitability/breakdown?analysis_type=${analysisType}&zone_unit_id=${zoneUnitId}`, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { if (active) setData(json.data); })
      .catch(e => { if (active) setError(`Could not load the score breakdown (${e.message}).`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [zoneUnitId, analysisType]);

  if (error) return <div style={{ fontSize: 12.5, color: 'hsl(var(--destructive))' }}>{error}</div>;
  if (loading || !data) return <div className="muted" style={{ fontSize: 12.5 }}>Loading score breakdown…</div>;

  const excluded = data.constraint?.excluded;
  const maxContribution = Math.max(...data.criteria.map(c => c.weighted), 0.0001);

  return (
    <div>
      <table className="table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th>Criterion</th>
            <th style={{ textAlign: 'right' }}>Score</th>
            <th style={{ textAlign: 'center' }}>×</th>
            <th style={{ textAlign: 'right' }}>AHP weight</th>
            <th style={{ textAlign: 'center' }}>=</th>
            <th style={{ textAlign: 'right' }}>Contribution</th>
            <th style={{ width: '28%' }}></th>
          </tr>
        </thead>
        <tbody>
          {data.criteria.map(c => (
            <tr key={c.criterion} style={{ opacity: c.weight > 0 ? 1 : 0.45 }}>
              <td>{c.criterion}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{c.score.toFixed(4)}</td>
              <td className="muted" style={{ textAlign: 'center' }}>×</td>
              <td className="mono" style={{ textAlign: 'right' }}>{(c.weight * 100).toFixed(1)}%</td>
              <td className="muted" style={{ textAlign: 'center' }}>=</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{c.weighted.toFixed(4)}</td>
              <td>
                <div className="meter"><span style={{ width: `${(c.weighted / maxContribution) * 100}%` }}/></div>
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: 600 }}>Weighted sum</td>
            <td colSpan={4}></td>
            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{data.weighted_sum.toFixed(4)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
        <span>
          Final score{' '}
          <b className="mono" style={{ color: LEVEL_COLOR[data.suitability_level] }}>{data.total_pct}%</b>
          {' · '}
          <b style={{ color: LEVEL_COLOR[data.suitability_level] }}>{data.suitability_level}</b>
        </span>
        {data.constraint && (
          <span className="muted">
            {excluded
              ? <>Excluded by the CLUP constraint step: only {(data.constraint.available_share * 100).toFixed(1)}% of its zoned land is usable (mainly {Object.keys(data.constraint.reasons)[0]}), so the weighted sum is not used.</>
              : <>Usable area after the constraint step: {data.constraint.available_area_ha} ha ({(data.constraint.available_share * 100).toFixed(1)}%).</>}
          </span>
        )}
      </div>
    </div>
  );
}
