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

// ─── PDF helpers (module-level so both export functions share them) ───────────

const PDF_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
  .type-section { max-width: 900px; margin: 0 auto; padding: 32px 36px; }
  .sec-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
  .logo span { color: #111; }
  .header-meta { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.6; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .summary-row { display: flex; gap: 20px; align-items: center; margin-bottom: 16px; }
  .top-cards { display: flex; gap: 12px; flex-wrap: wrap; }
  .weights-table { width: 100%; border-collapse: collapse; }
  .weights-table td { padding: 5px 8px; font-size: 12px; }
  .weights-table tr:nth-child(even) td { background: #f9fafb; }
  .rankings-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .rankings-table th { background: #1e3a5f; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .rankings-table th:not(:first-child) { text-align: center; }
  .rankings-table td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  .sec-footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 10.5px; color: #9ca3af; display: flex; justify-content: space-between; }
  .cover { max-width: 900px; margin: 0 auto; padding: 80px 60px; display: flex; flex-direction: column; justify-content: center; min-height: 90vh; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-after: always; }
    .no-break { page-break-inside: avoid; }
    .type-section { padding: 20px 24px; }
  }
`;

function buildTypeSection(type, { rankings, avgScore, weights, exportRows, selectionNote, isLast, dateStr }) {
  const typeLabel    = TYPE_LABELS[type];
  const exportAvgPct = Math.round(avgScore);
  const levelLabel   = exportAvgPct >= 75 ? 'Highly Suitable' : exportAvgPct >= 50 ? 'Moderately Suitable' : 'Low Suitability';
  const levelColor   = exportAvgPct >= 75 ? '#16a34a' : exportAvgPct >= 50 ? '#d97706' : '#dc2626';

  const weightsRows = weights
    ? Object.entries(weights).map(([name, w]) => {
        const pct = Math.round(w * 100);
        return `<tr>
          <td>${name}</td>
          <td style="text-align:right;font-weight:600;">${pct}%</td>
          <td style="padding-left:10px;">
            <div style="height:8px;background:#e5e7eb;border-radius:4px;width:120px;">
              <div style="height:8px;background:#2563eb;border-radius:4px;width:${pct * 1.2}px;"></div>
            </div>
          </td>
        </tr>`;
      }).join('')
    : '';

  const topSuitable = rankings.filter(r => r.suitability_level === 'Highly Suitable').slice(0, 3);
  const topCards = topSuitable.map(r => `
    <div style="flex:1;min-width:140px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;">
      <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">Rank #${r.rank}</div>
      <div style="font-size:14px;font-weight:700;color:#111;">${r.unit_name}</div>
      <div style="font-size:22px;font-weight:800;color:#16a34a;margin:4px 0;">${r.total_pct}%</div>
      <div style="font-size:11px;color:#6b7280;">${r.unit_type}</div>
    </div>`).join('');

  const tableRows = exportRows.map((r, i) => {
    const bg         = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    const scoreColor = r.total_pct >= 75 ? '#16a34a' : r.total_pct >= 50 ? '#d97706' : '#dc2626';
    const levelBg    = r.total_pct >= 75 ? '#dcfce7'  : r.total_pct >= 50 ? '#fef3c7'  : '#fee2e2';
    return `<tr style="background:${bg};">
      <td style="text-align:center;color:#9ca3af;">${r.rank}</td>
      <td style="font-weight:600;">${r.unit_name}</td>
      <td style="text-align:center;">
        <span style="font-size:10px;padding:2px 7px;border-radius:4px;background:${r.unit_type === 'Urban' ? '#dbeafe' : '#f3f4f6'};color:${r.unit_type === 'Urban' ? '#1d4ed8' : '#374151'};">${r.unit_type}</span>
      </td>
      <td style="text-align:center;font-weight:700;color:${scoreColor};">${r.total_pct}%</td>
      <td style="text-align:center;">${Math.round(r.flood_score * 100)}%</td>
      <td style="text-align:center;">${Math.round(r.liquefaction_score * 100)}%</td>
      <td style="text-align:center;">${Math.round(r.slope_score * 100)}%</td>
      <td style="text-align:center;">${Math.round(r.soil_score * 100)}%</td>
      <td style="text-align:center;">
        <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${levelBg};color:${scoreColor};">${r.suitability_level}</span>
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="type-section${!isLast ? ' page-break' : ''}">
    <div class="sec-header">
      <div>
        <div class="logo">Terra<span>Spec</span></div>
        <div style="font-size:13px;font-weight:600;color:#374151;margin-top:4px;">Land Suitability Analysis Report</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">${typeLabel} · Panabo City, Davao del Norte</div>
      </div>
      <div class="header-meta">
        <div>Generated: ${dateStr}</div>
        <div>Analysis Type: <strong>${typeLabel}</strong></div>
        <div>Total Zones: ${rankings.length} · AHP-WLC Method</div>
        <div>Source: CLUP Panabo City CY 2020–2029</div>
      </div>
    </div>

    <div class="section no-break">
      <div class="section-title">Summary</div>
      <div class="summary-row">
        <div style="width:80px;height:80px;border-radius:50%;border:6px solid ${levelColor};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:22px;font-weight:800;color:${levelColor};line-height:1;">${exportAvgPct}</span>
          <span style="font-size:11px;color:#6b7280;">%</span>
        </div>
        <div>
          <div style="font-size:18px;font-weight:700;color:${levelColor};">${levelLabel}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:3px;">City-wide average across ${rankings.length} zones</div>
          <div style="font-size:11px;color:#6b7280;margin-top:6px;">
            Score range: ${Math.min(...exportRows.map(r => r.total_pct))}% – ${Math.max(...exportRows.map(r => r.total_pct))}%
            &nbsp;|&nbsp; Highly Suitable: ${exportRows.filter(r => r.suitability_level === 'Highly Suitable').length} zones
            &nbsp;|&nbsp; Moderately Suitable: ${exportRows.filter(r => r.suitability_level === 'Moderately Suitable').length} zones
          </div>
        </div>
      </div>
    </div>

    ${weights ? `
    <div class="section no-break">
      <div class="section-title">AHP Criteria Weights · ${typeLabel}</div>
      <table class="weights-table"><tbody>${weightsRows}</tbody></table>
    </div>` : ''}

    ${topSuitable.length > 0 ? `
    <div class="section no-break">
      <div class="section-title">Top Highly Suitable Zones</div>
      <div class="top-cards">${topCards}</div>
    </div>` : ''}

    <div class="section">
      <div class="section-title">Comparative Ranking — ${typeLabel} (All ${rankings.length} Zones)</div>
      ${selectionNote}
      <table class="rankings-table">
        <thead>
          <tr>
            <th style="width:36px;">#</th>
            <th>Barangay</th><th>Type</th><th>Total Score</th>
            <th>Flood</th><th>Liquefaction</th><th>Slope</th><th>Soil</th>
            <th>Suitability Level</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <div class="sec-footer">
      <div>Data source: CLUP Panabo City CY 2020–2029, Vol. 1 &nbsp;|&nbsp; DENR-MGB XI, 2020 &nbsp;|&nbsp; BSWM 2019</div>
      <div>For planning reference only. Subject to ground verification.</div>
    </div>
  </div>`;
}

function wrapInDocument(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${PDF_CSS}</style>
</head>
<body>
${bodyContent}
<script>window.onload = () => { window.focus(); window.print(); }<\/script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [checkedIds, setCheckedIds]     = useState(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCheckedIds(new Set());
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

  // Derive display values from selection
  const checkedCount   = checkedIds.size;
  const checkedRows    = rankings.filter(r => checkedIds.has(r.zone_unit_id));
  const displayPct     = checkedCount === 0
    ? Math.round(avgScore)
    : Math.round(checkedRows.reduce((s, r) => s + r.total_pct, 0) / checkedCount);
  const displayLabel   = checkedCount === 0
    ? `Avg Score · ${TYPE_LABELS[analysisType]}`
    : checkedCount === 1
      ? `Score · ${checkedRows[0].unit_name}`
      : `Avg Score · ${checkedCount} Selected`;
  const displaySub     = checkedCount === 0
    ? `${rankings.length} zones · avg ${avgScore}%`
    : checkedCount === 1
      ? `${checkedRows[0].unit_name} · ${TYPE_LABELS[analysisType]}`
      : `${checkedCount} of ${rankings.length} zones selected · avg ${displayPct}%`;
  const avgPct         = displayPct;

  function toggleCheck(id) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checkedIds.size === rankings.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(rankings.map(r => r.zone_unit_id)));
    }
  }

  const allChecked  = rankings.length > 0 && checkedIds.size === rankings.length;
  const someChecked = checkedIds.size > 0 && !allChecked;
  const [exportingAll, setExportingAll] = useState(false);

  function exportPDF() {
    const exportRows    = checkedCount > 0 ? checkedRows : rankings;
    const selectionNote = checkedCount > 0
      ? `<div style="margin-bottom:12px;padding:8px 12px;background:#eff6ff;border-left:3px solid #2563eb;font-size:12px;color:#1d4ed8;">
           Filtered selection: ${checkedCount} of ${rankings.length} zones selected
         </div>`
      : '';
    const dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const section = buildTypeSection(analysisType, {
      rankings, avgScore, weights: appliedWeights,
      exportRows, selectionNote, isLast: true, dateStr,
    });
    const win = window.open('', '_blank');
    win.document.write(wrapInDocument(`TerraSpec · ${TYPE_LABELS[analysisType]} Suitability`, section));
    win.document.close();
  }

  async function exportAllPDF() {
    setExportingAll(true);
    const dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    try {
      const results = await Promise.all(
        ANALYSIS_TYPES.map(t =>
          fetch(`/suitability/rankings?analysis_type=${t}`)
            .then(r => r.json())
            .then(json => ({ type: t, rankings: json.data ?? [], avgScore: json.avg_score ?? 0 }))
        )
      );

      const coverPage = `
        <div class="cover page-break">
          <div style="margin-bottom:32px;">
            <div class="logo" style="font-size:32px;">Terra<span>Spec</span></div>
            <div style="width:48px;height:4px;background:#2563eb;border-radius:2px;margin-top:10px;"></div>
          </div>
          <h1 style="font-size:28px;font-weight:800;color:#111;line-height:1.2;margin-bottom:12px;">
            Comprehensive Land<br/>Suitability Analysis Report
          </h1>
          <p style="font-size:15px;color:#6b7280;margin-bottom:8px;">Panabo City, Davao del Norte</p>
          <p style="font-size:13px;color:#9ca3af;margin-bottom:48px;">Generated: ${dateStr} · AHP-WLC Method · CLUP 2020–2029</p>
          <div style="border-top:1px solid #e5e7eb;padding-top:28px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:16px;">Contents</div>
            ${results.map((d, i) => {
              const avg  = Math.round(d.avgScore);
              const color = avg >= 75 ? '#16a34a' : avg >= 50 ? '#d97706' : '#dc2626';
              const level = avg >= 75 ? 'Highly Suitable' : avg >= 50 ? 'Moderately Suitable' : 'Low Suitability';
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:12px;font-weight:700;color:#9ca3af;width:20px;">${i + 1}</span>
                    <span style="font-size:14px;font-weight:600;color:#111;">${TYPE_LABELS[d.type]} Suitability Analysis</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:13px;font-weight:700;color:${color};">${avg}%</span>
                    <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${avg >= 75 ? '#dcfce7' : avg >= 50 ? '#fef3c7' : '#fee2e2'};color:${color};">${level}</span>
                  </div>
                </div>`;
            }).join('')}
          </div>
          <div style="margin-top:auto;padding-top:48px;font-size:10.5px;color:#9ca3af;">
            Data source: CLUP Panabo City CY 2020–2029, Vol. 1 · DENR-MGB XI, 2020 · BSWM 2019<br/>
            For planning reference only. Subject to ground verification.
          </div>
        </div>`;

      const sections = results.map((d, i) =>
        buildTypeSection(d.type, {
          rankings:  d.rankings,
          avgScore:  d.avgScore,
          weights:   d.rankings[0]?.applied_weights ?? null,
          exportRows: d.rankings,
          selectionNote: '',
          isLast:    i === results.length - 1,
          dateStr,
        })
      ).join('\n');

      const win = window.open('', '_blank');
      win.document.write(wrapInDocument('TerraSpec · Comprehensive Suitability Analysis', coverPage + sections));
      win.document.close();
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suitability Analysis</h1>
          <p className="page-subtitle">AHP-WLC land suitability scoring · 40 zone units · Panabo City</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="outline" icon="download" onClick={exportPDF} disabled={loading || rankings.length === 0}>
            Export PDF{checkedCount > 0 ? ` (${checkedCount} zones)` : ''}
          </Btn>
          <Btn variant="brand" icon="download" onClick={exportAllPDF} disabled={loading || exportingAll}>
            {exportingAll ? 'Fetching…' : 'Export All Types'}
          </Btn>
        </div>
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
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{displayLabel}</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {loading ? '—' : avgPct >= 75 ? 'Highly Suitable' : avgPct >= 50 ? 'Moderately Suitable' : 'Low Suitability'}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {loading ? '' : displaySub}
              </div>
              {checkedCount > 0 && !loading && (
                <button
                  onClick={() => setCheckedIds(new Set())}
                  style={{ marginTop: 8, fontSize: 11, color: 'hsl(var(--muted-foreground))', background: 'none', border: '1px solid hsl(var(--border))', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                >
                  Clear selection
                </button>
              )}
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
                  <th style={{ width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={el => { if (el) el.indeterminate = someChecked; }}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
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
                {rankings.map(row => {
                  const isChecked = checkedIds.has(row.zone_unit_id);
                  return (
                  <tr
                    key={row.zone_unit_id}
                    style={{ background: isChecked ? 'hsl(var(--brand) / 0.07)' : undefined, cursor: 'pointer' }}
                    onClick={() => toggleCheck(row.zone_unit_id)}
                  >
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(row.zone_unit_id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
