import React, { useState } from 'react';
import { PANABO } from './data.js';
import { Btn, Card, CardHeader, Inp } from './components.jsx';

export function AdminScreen() {
  const [tab, setTab] = useState('parcels');
  const tabs = ['parcels','zones','criteria','restrictions','species','users'];

  const tableData = {
    parcels:      { cols: ['ID','Barangay','Zone','Area','Score','Flag'], rows: PANABO.parcels.map(p => [p.id, p.barangay, p.zone, `${p.area.toLocaleString()} sqm`, `${p.score}%`, p.flag || '—']) },
    zones:        { cols: ['ID','Name','Allowed Use'], rows: PANABO.zones.map(z => [z.id, z.name, z.allowed_use.slice(0, 50)+'…']) },
    criteria:     { cols: ['ID','Name','Weight'], rows: PANABO.criteria.map(c => [c.id, c.name, `${Math.round(c.weight*100)}%`]) },
    restrictions: { cols: ['ID','Name','Zone','Severity'], rows: PANABO.restrictions.map(r => [r.id, r.name, r.zone||'All', r.severity]) },
    species:      { cols: ['ID','Name','Score','Salinity'], rows: PANABO.species.map(s => [s.id, s.name.split(' (')[0], `${s.score}%`, s.salinity]) },
    users:        { cols: ['Name','Role','Email','Last login'], rows: [['Admin User','admin','admin@panabo.gov.ph','2026-05-27'],['CPDO Analyst','lgu','cpdo@panabo.gov.ph','2026-05-26'],['CENRO Officer','lgu','cenro@panabo.gov.ph','2026-05-25']] },
  };
  const { cols, rows } = tableData[tab];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Manage parcels, zones, criteria, and user accounts</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="outline" icon="download">Export CSV</Btn>
          <Btn variant="brand" icon="plus">Add Record</Btn>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20, display: 'inline-flex' }}>
        {tabs.map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title" style={{ textTransform: 'capitalize' }}>{tab}</span>
            <Inp icon="search" placeholder={`Search ${tab}…`} value="" onChange={() => {}} style={{ width: 220 }}/>
          </div>
        </CardHeader>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}<th></th></tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <Btn sz="xs" variant="ghost" icon="edit"/>
                      <Btn sz="xs" variant="ghost" icon="trash"/>
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
