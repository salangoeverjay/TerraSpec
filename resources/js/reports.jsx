import React, { useState, useEffect } from 'react';
import { PANABO } from './data.js';
import { Btn, Card, CardHeader, CardBody, Badge, Inp, Icon } from './components.jsx';

const REPORT_TYPES = [
  'Suitability Summary',
  'Environmental Clearance',
  'Zone Compliance Check',
  'Reforestation Plan',
  'Comparative Analysis',
  'Hazard Assessment',
];

const LAND_USES = {
  commercial: 'Commercial', residential: 'Residential', industrial: 'Industrial',
  agricultural: 'Agricultural', reforestation: 'Reforestation',
};

const SECTIONS = [
  'Executive Summary',
  'MCDA Scores',
  'Zone Compliance',
  'Environmental Flags',
  'Hazard Data',
  'Recommendations',
];

function statusVariant(status) {
  if (status === 'Final')    return 'brand';
  if (status === 'Draft')    return 'warn';
  if (status === 'Review')   return '';
  return '';
}

export function ReportsScreen({ role }) {
  const [type, setType]         = useState(REPORT_TYPES[0]);
  const [barangay, setBarangay] = useState('');
  const [landUse, setLandUse]   = useState('commercial');
  const [error, setError]       = useState('');
  const [sections, setSections] = useState(new Set(SECTIONS));
  const [filter, setFilter]     = useState('');
  const [generating, setGenerating] = useState(false);
  const [archive, setArchive]   = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  // Reforestation plans only cover the study area (barangays with verified reforestation or mangrove sites)
  const [studyArea, setStudyArea] = useState({ barangays: [], note: '' });

  useEffect(() => {
    fetch('/reforestation', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => setStudyArea(json.study_area ?? { barangays: [], note: '' }))
      .catch(() => {});
  }, []);

  // Reforestation (plans and scores) is only assessed in the study area
  const reforestationOnly = type === 'Reforestation Plan' || landUse === 'reforestation';
  const barangayOptions = reforestationOnly ? studyArea.barangays : PANABO.barangays;

  // Keep the selected barangay valid for the chosen report type
  useEffect(() => {
    if (type !== 'Comparative Analysis' && barangayOptions.length > 0 && !barangayOptions.includes(barangay)) {
      setBarangay(barangayOptions[0]);
    }
  }, [type, barangayOptions, barangay]);

  function loadArchive() {
    return fetch('/api/reports', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => setArchive(Array.isArray(json) ? json : []))
      .catch(() => setArchive([]))
      .finally(() => setArchiveLoading(false));
  }

  // Staff see who generated each report; the public archive shows CPDO
  useEffect(() => { loadArchive(); }, [role]);

  // Downloads the PDF with the staff session; validation or permission errors are shown as text
  async function generateReport(params = { type, barangay, landUse, sections: [...sections] }) {
    const query = new URLSearchParams({ type: params.type });
    if (params.type !== 'Comparative Analysis') query.set('barangay', params.barangay);
    if (params.type !== 'Reforestation Plan' && params.landUse) query.set('land_use', params.landUse);
    (params.sections ?? []).forEach(sec => query.append('sections[]', sec));

    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/generate?${query}`, { headers: { Accept: 'application/json, application/pdf' } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const firstError = Object.values(body.errors ?? {}).flat()[0];
        throw new Error(firstError ?? body.message ?? `Could not generate the report (HTTP ${res.status}).`);
      }
      const blob = await res.blob();
      const name = /filename="?([^";]+)"?/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'terraspec-report.pdf';
      const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
      link.click();
      URL.revokeObjectURL(link.href);
      loadArchive();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function toggleSection(s) {
    setSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  const filtered = archive.filter(r =>
    !filter ||
    (r.report_type ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (r.barangay    ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (r.generated_by ?? '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate, review, and download land analysis reports</p>
        </div>
      </div>

      {role === 'admin' ? (
        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <div style={{ gridColumn: '1 / 3' }}>
            <Card>
              <CardHeader><span className="card-title">Report Builder</span></CardHeader>
              <CardBody>
                <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="label">Report Type</label>
                    <select className="input" value={type} onChange={e => setType(e.target.value)}>
                      {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    {type !== 'Reforestation Plan' && (
                      <>
                        <label className="label" style={{ marginTop: 10 }}>Land use</label>
                        <select className="input" value={landUse} onChange={e => setLandUse(e.target.value)}>
                          {Object.entries(LAND_USES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="label">Barangay</label>
                    <select className="input" value={barangay} onChange={e => setBarangay(e.target.value)}>
                      {type === 'Comparative Analysis'
                        ? <option value="All Barangays">All Barangays (City-wide)</option>
                        : barangayOptions.map(b => <option key={b} value={b}>{b}</option>)
                      }
                    </select>
                    {reforestationOnly && studyArea.note && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{studyArea.note}</div>
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="label">Sections to include</label>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {SECTIONS.map(s => (
                      <label key={s} className="chip" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sections.has(s)}
                          onChange={() => toggleSection(s)}
                          style={{ accentColor: 'hsl(var(--brand))' }}
                        /> {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Btn variant="brand" icon="download" disabled={generating || (type !== 'Comparative Analysis' && !barangay)} onClick={() => generateReport()}>
                    {generating ? 'Generating…' : 'Generate PDF'}
                  </Btn>
                </div>
                {error && <div style={{ marginTop: 10, fontSize: 12.5, color: 'hsl(var(--destructive))' }}>{error}</div>}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader><span className="card-title">Preview</span></CardHeader>
            <CardBody>
              <div style={{ background: 'hsl(var(--muted))', borderRadius: 8, padding: 14, fontSize: 12.5, lineHeight: 1.8, minHeight: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{type}</div>
                {type !== 'Reforestation Plan' && <div className="muted">Land use: <strong style={{ color: 'hsl(var(--foreground))' }}>{LAND_USES[landUse]}</strong></div>}
                <div className="muted">Barangay: <strong style={{ color: 'hsl(var(--foreground))' }}>{type === 'Comparative Analysis' ? 'All Barangays' : barangay}</strong></div>
                <div className="muted">Date: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="muted">Prepared by: CPDO, Panabo City</div>
                <hr className="separator" style={{ margin: '10px 0' }}/>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Sections: {[...sections].join(' · ') || '—'}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                  This report presents AHP-WLC suitability results and environmental data for {type === 'Comparative Analysis' ? (reforestationOnly ? 'the reforestation study area' : 'all 40 barangays') : `Barangay ${barangay}`}, Panabo City.
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card style={{ marginBottom: 20 }}>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 12, textAlign: 'center' }}>
              <Icon name="lock" size={36} style={{ color: 'hsl(var(--muted-foreground))' }}/>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Report Generation is Restricted</div>
              <p className="muted" style={{ fontSize: 13, maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
                Only signed-in CPDO staff (administrators and planners) can generate official land analysis reports. Sign in with LGU Admin to use the Report Builder.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title">Report Archive</span>
            <Inp icon="search" placeholder="Search reports…" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 220 }}/>
          </div>
        </CardHeader>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Barangay</th>
                <th>Date</th>
                <th>Status</th>
                <th>Generated by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {archiveLoading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }} className="muted">Loading archive…</td></tr>
              )}
              {!archiveLoading && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }} className="muted">
                  {archive.length === 0 ? 'No reports generated yet. Use the Report Builder above.' : 'No reports match your search.'}
                </td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span className="mono muted" style={{ fontSize: 11.5 }}>RPT-{String(r.id).padStart(4, '0')}</span></td>
                  <td>
                    {r.report_type}
                    {r.analysis_type && r.report_type !== 'Reforestation Plan' && <div className="muted" style={{ fontSize: 11 }}>{LAND_USES[r.analysis_type] ?? r.analysis_type}</div>}
                  </td>
                  <td><span style={{ fontWeight: 500 }}>{r.barangay}</span></td>
                  <td>{r.created_at}</td>
                  <td><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
                  <td>{r.generated_by}</td>
                  <td>
                    {role === 'admin' && (
                      <div className="row" style={{ gap: 4 }} title="Generate this report again with current data">
                        <Btn sz="xs" variant="ghost" icon="download" disabled={generating} onClick={() => generateReport({
                          type: r.report_type,
                          barangay: r.barangay === 'All Barangays' ? '' : r.barangay,
                          landUse: r.analysis_type ?? 'commercial',
                          sections: SECTIONS,
                        })}/>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
