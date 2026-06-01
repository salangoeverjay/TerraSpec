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
  const [barangay, setBarangay] = useState('Poblacion');
  const [sections, setSections] = useState(new Set(SECTIONS));
  const [filter, setFilter]     = useState('');
  const [generating, setGenerating] = useState(false);
  const [archive, setArchive]   = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(json => setArchive(Array.isArray(json) ? json : []))
      .catch(() => setArchive([]))
      .finally(() => setArchiveLoading(false));
  }, []);

  function generateReport() {
    const isComparative = type === 'Comparative Analysis';
    const params = new URLSearchParams({
      type,
      barangay: isComparative ? 'All Barangays' : barangay,
    });
    [...sections].forEach(s => params.append('sections[]', s));
    setGenerating(true);
    const url = `/reports/generate?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Refresh archive after a short delay so the new record appears
    setTimeout(() => {
      fetch('/api/reports')
        .then(r => r.json())
        .then(json => setArchive(Array.isArray(json) ? json : []))
        .catch(() => {});
      setGenerating(false);
    }, 4000);
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
                  </div>
                  <div>
                    <label className="label">Barangay</label>
                    <select className="input" value={barangay} onChange={e => setBarangay(e.target.value)}>
                      {type === 'Comparative Analysis'
                        ? <option value="All Barangays">All Barangays (City-wide)</option>
                        : PANABO.barangays.map(b => <option key={b} value={b}>{b}</option>)
                      }
                    </select>
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
                  <Btn variant="brand" icon="download" disabled={generating} onClick={generateReport}>
                    {generating ? 'Generating…' : 'Generate PDF'}
                  </Btn>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader><span className="card-title">Preview</span></CardHeader>
            <CardBody>
              <div style={{ background: 'hsl(var(--muted))', borderRadius: 8, padding: 14, fontSize: 12.5, lineHeight: 1.8, minHeight: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{type}</div>
                <div className="muted">Barangay: <strong style={{ color: 'hsl(var(--foreground))' }}>{type === 'Comparative Analysis' ? 'All Barangays' : barangay}</strong></div>
                <div className="muted">Date: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="muted">Prepared by: CPDO, Panabo City</div>
                <hr className="separator" style={{ margin: '10px 0' }}/>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Sections: {[...sections].join(' · ') || '—'}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                  This report presents AHP-WLC suitability results and environmental data for {type === 'Comparative Analysis' ? 'all 40 barangays' : `Barangay ${barangay}`}, Panabo City.
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
                Only LGU Admin accounts can generate, configure, and export official land analysis reports. Switch to LGU Admin to access the Report Builder.
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
                  <td>{r.report_type}</td>
                  <td><span style={{ fontWeight: 500 }}>{r.barangay}</span></td>
                  <td>{r.created_at}</td>
                  <td><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
                  <td>{r.generated_by}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <Btn sz="xs" variant="ghost" icon="download"/>
                    </div>
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
