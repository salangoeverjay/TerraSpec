import React, { useState, useEffect, useCallback } from 'react';
import { Icon, Btn, Card, CardHeader, CardBody, Inp } from './components.jsx';

const WEIGHT_TYPES = ['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'];

const TAB_CONFIG = {
  zones: {
    pk: 'zone_unit_id',
    headers: ['Name', 'Type', 'Tier', 'Area (ha)', 'Salinity'],
    display: r => [r.unit_name, r.unit_type, r.settlement_tier, Number(r.total_area_ha).toLocaleString(), r.salinity_level],
    searchKeys: ['unit_name', 'unit_type', 'settlement_tier'],
    fields: [
      { key: 'unit_name',       label: 'Unit Name',        type: 'text',   required: true },
      { key: 'unit_type',       label: 'Type',             type: 'select', opts: ['Urban','Rural'], required: true },
      { key: 'settlement_tier', label: 'Settlement Tier',  type: 'select', opts: ['CBD','Minor_Growth','Emerging','Satellite'], required: true },
      { key: 'total_area_ha',   label: 'Total Area (ha)',  type: 'number', required: true },
      { key: 'elevation_min',   label: 'Elevation Min (m)',type: 'number', required: true },
      { key: 'elevation_max',   label: 'Elevation Max (m)',type: 'number', required: true },
      { key: 'salinity_level',  label: 'Salinity Level',   type: 'select', opts: ['None','Low','Med','High'], required: true },
    ],
    canAdd: false, canDelete: false,
  },
  restrictions: {
    pk: 'restriction_id',
    headers: ['Name', 'Type', 'Description'],
    display: r => [r.restriction_name, r.restriction_type, (r.description||'—').slice(0,60)+((r.description||'').length>60?'…':'')],
    searchKeys: ['restriction_name', 'restriction_type'],
    fields: [
      { key: 'restriction_name', label: 'Name',        type: 'text',     required: true },
      { key: 'restriction_type', label: 'Type',        type: 'select',   opts: ['Mangrove','Watershed','SAFDZ','Ecological','Hazard'], required: true },
      { key: 'description',      label: 'Description', type: 'textarea' },
    ],
    canAdd: true, canDelete: true,
  },
  species: {
    pk: 'species_id',
    headers: ['Common Name', 'Scientific Name', 'Soil', 'Salinity'],
    display: r => [r.common_name, r.scientific_name, r.soil_preference, r.salinity_level],
    searchKeys: ['common_name', 'scientific_name', 'soil_preference'],
    fields: [
      { key: 'common_name',       label: 'Common Name',       type: 'text',   required: true },
      { key: 'scientific_name',   label: 'Scientific Name',   type: 'text',   required: true },
      { key: 'soil_preference',   label: 'Soil Preference',   type: 'text',   required: true },
      { key: 'elevation_range',   label: 'Elevation Range',   type: 'text',   required: true },
      { key: 'temperature_range', label: 'Temperature Range', type: 'text',   required: true },
      { key: 'salinity_level',    label: 'Salinity',          type: 'select', opts: ['None','Low','Med','High'], required: true },
      { key: 'suitability_notes', label: 'Notes',             type: 'textarea' },
    ],
    canAdd: true, canDelete: true,
  },
  users: {
    pk: 'id',
    headers: ['Name', 'Email', 'Role'],
    display: r => [r.name, r.email, r.role],
    searchKeys: ['name', 'email', 'role'],
    fields: [
      { key: 'name',     label: 'Full Name', type: 'text',     required: true },
      { key: 'email',    label: 'Email',     type: 'text',     required: true },
      { key: 'role',     label: 'Role',      type: 'select',   opts: ['admin','planner','viewer'], required: true },
      { key: 'password', label: 'New Password', type: 'password', placeholder: 'Leave blank to keep current' },
    ],
    canAdd: false, canDelete: true,
  },
};

async function apiFetch(method, path, body) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Request failed.');
  return json;
}

export function AdminScreen() {
  const TABS = ['zones', 'criteria', 'restrictions', 'species', 'users'];
  const [tab, setTab]       = useState('zones');
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [filter, setFilter] = useState('');
  const [modal, setModal]   = useState(null); // { mode:'add'|'edit', record:{} }
  const [draft, setDraft]   = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Criteria-specific
  const [weights, setWeights]       = useState({}); // { [criteria_id]: { commercial, residential, ... } }
  const [weightsDirty, setWeightsDirty] = useState(false);
  const [weightsSaving, setWeightsSaving] = useState(false);
  const [weightsErr, setWeightsErr] = useState('');
  const [weightsSaved, setWeightsSaved] = useState(false);

  const load = useCallback(async (t) => {
    setLoading(true); setLoadErr(''); setFilter('');
    try {
      const json = await apiFetch('GET', `/${t}`);
      const list = Array.isArray(json) ? json : [];
      setRows(list);
      if (t === 'criteria') {
        const w = {};
        list.forEach(c => {
          w[c.criteria_id] = {
            commercial:    parseFloat(c.commercial_weight)    || 0,
            residential:   parseFloat(c.residential_weight)   || 0,
            industrial:    parseFloat(c.industrial_weight)    || 0,
            agricultural:  parseFloat(c.agricultural_weight)  || 0,
            reforestation: parseFloat(c.reforestation_weight) || 0,
          };
        });
        setWeights(w); setWeightsDirty(false); setWeightsErr(''); setWeightsSaved(false);
      }
    } catch (e) { setLoadErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  // ── GENERIC CRUD ─────────────────────────────────────────────────
  function openAdd() {
    const cfg = TAB_CONFIG[tab];
    const empty = {};
    cfg.fields.forEach(f => { empty[f.key] = f.opts ? f.opts[0] : ''; });
    setDraft(empty); setSaveErr(''); setModal({ mode: 'add' });
  }

  function openEdit(record) {
    setDraft({ ...record }); setSaveErr(''); setModal({ mode: 'edit', record });
  }

  async function handleSave() {
    const cfg = TAB_CONFIG[tab];
    setSaving(true); setSaveErr('');
    try {
      if (modal.mode === 'add') {
        await apiFetch('POST', `/${tab}`, draft);
      } else {
        const id = modal.record[cfg.pk];
        await apiFetch('PUT', `/${tab}/${id}`, draft);
      }
      setModal(null);
      load(tab);
    } catch (e) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(record) {
    const cfg = TAB_CONFIG[tab];
    if (!window.confirm('Delete this record?')) return;
    try {
      await apiFetch('DELETE', `/${tab}/${record[cfg.pk]}`);
      load(tab);
    } catch (e) { alert(e.message); }
  }

  // ── CRITERIA WEIGHTS ────────────────────────────────────────────
  function setWeight(criteriaId, type, value) {
    const num = Math.min(1, Math.max(0, parseFloat(value) || 0));
    setWeights(prev => ({ ...prev, [criteriaId]: { ...prev[criteriaId], [type]: num } }));
    setWeightsDirty(true); setWeightsSaved(false);
  }

  function colSum(type) {
    return Object.values(weights).reduce((s, w) => s + (w[type] || 0), 0);
  }

  function allColsValid() {
    return WEIGHT_TYPES.every(t => Math.abs(colSum(t) - 1) < 0.001);
  }

  async function saveWeights() {
    setWeightsSaving(true); setWeightsErr('');
    try {
      const payload = rows.map(c => ({
        criteria_id:          c.criteria_id,
        commercial_weight:    weights[c.criteria_id]?.commercial    ?? 0,
        residential_weight:   weights[c.criteria_id]?.residential   ?? 0,
        industrial_weight:    weights[c.criteria_id]?.industrial    ?? 0,
        agricultural_weight:  weights[c.criteria_id]?.agricultural  ?? 0,
        reforestation_weight: weights[c.criteria_id]?.reforestation ?? 0,
      }));
      await apiFetch('PUT', '/criteria', payload);
      setWeightsDirty(false); setWeightsSaved(true);
      setTimeout(() => setWeightsSaved(false), 3000);
      load('criteria');
    } catch (e) { setWeightsErr(e.message); }
    finally { setWeightsSaving(false); }
  }

  // ── FILTERED ROWS ───────────────────────────────────────────────
  const cfg = TAB_CONFIG[tab];
  const filtered = cfg
    ? rows.filter(r => !filter || cfg.searchKeys.some(k => String(r[k]||'').toLowerCase().includes(filter.toLowerCase())))
    : rows;

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Manage zones, criteria weights, restrictions, species, and users</p>
        </div>
        {cfg?.canAdd && (
          <Btn variant="brand" icon="plus" onClick={openAdd}>Add Record</Btn>
        )}
      </div>

      <div className="tabs" style={{ marginBottom: 20, display: 'inline-flex' }}>
        {TABS.map(t => (
          <div
            key={t}
            className={`tab${tab === t ? ' active' : ''}`}
            style={{ cursor: 'pointer', textTransform: 'capitalize' }}
            onClick={() => { setTab(t); setModal(null); }}
          >
            {t === 'criteria' ? 'AHP Weights' : t}
          </div>
        ))}
      </div>

      {loadErr && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'hsl(var(--destructive)/0.1)', border: '1px solid hsl(var(--destructive)/0.25)', fontSize: 13, color: 'hsl(var(--destructive))' }}>
          {loadErr}
        </div>
      )}

      {/* ── CRITERIA WEIGHT MATRIX ── */}
      {tab === 'criteria' && (
        <Card>
          <CardHeader>
            <div className="row-between">
              <div>
                <span className="card-title">AHP Criteria Weights</span>
                <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>Each column must sum to 1.00</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {weightsErr && <span style={{ fontSize: 12, color: 'hsl(var(--destructive))' }}>{weightsErr}</span>}
                {weightsSaved && <span style={{ fontSize: 12, color: 'hsl(var(--brand))' }}>Saved</span>}
                <Btn
                  variant="brand"
                  icon={weightsSaving ? 'loader' : 'check'}
                  disabled={!weightsDirty || !allColsValid() || weightsSaving}
                  onClick={saveWeights}
                >
                  {weightsSaving ? 'Saving…' : 'Save Weights'}
                </Btn>
              </div>
            </div>
          </CardHeader>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading…</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Criterion</th>
                    {WEIGHT_TYPES.map(t => (
                      <th key={t} style={{ textAlign: 'center', textTransform: 'capitalize' }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => (
                    <tr key={c.criteria_id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.criteria_name}</div>
                        {c.description && <div className="muted" style={{ fontSize: 11.5 }}>{c.description}</div>}
                      </td>
                      {WEIGHT_TYPES.map(type => (
                        <td key={type} style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0" max="1" step="0.01"
                            value={weights[c.criteria_id]?.[type] ?? 0}
                            onChange={e => setWeight(c.criteria_id, type, e.target.value)}
                            className="input"
                            style={{ width: 72, textAlign: 'center', padding: '4px 6px', fontSize: 13 }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid hsl(var(--border))' }}>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>SUM</td>
                    {WEIGHT_TYPES.map(type => {
                      const sum = colSum(type);
                      const ok  = Math.abs(sum - 1) < 0.001;
                      return (
                        <td key={type} style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: ok ? 'hsl(var(--brand))' : 'hsl(var(--destructive))' }}>
                          {sum.toFixed(2)} {ok ? '✓' : '✗'}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          {weightsDirty && !allColsValid() && (
            <CardBody style={{ paddingTop: 10 }}>
              <div style={{ fontSize: 12, color: 'hsl(var(--destructive))' }}>
                Each column must sum to exactly 1.00 before saving. Adjust the weights marked in red.
              </div>
            </CardBody>
          )}
        </Card>
      )}

      {/* ── GENERIC TABLE ── */}
      {tab !== 'criteria' && (
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title" style={{ textTransform: 'capitalize' }}>{tab}</span>
              <Inp
                icon="search"
                placeholder={`Search ${tab}…`}
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ width: 220 }}
              />
            </div>
          </CardHeader>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading…</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    {cfg?.headers.map(h => <th key={h}>{h}</th>)}
                    <th/>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={(cfg?.headers.length||1)+1} style={{ textAlign:'center', padding: 32 }} className="muted">
                      {filter ? 'No results match your search.' : 'No records found.'}
                    </td></tr>
                  )}
                  {filtered.map(r => (
                    <tr key={r[cfg?.pk]}>
                      {cfg?.display(r).map((cell, i) => <td key={i}>{cell}</td>)}
                      <td>
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          <Btn sz="xs" variant="ghost" icon="edit" onClick={() => openEdit(r)}/>
                          {cfg?.canDelete && (
                            <Btn sz="xs" variant="ghost" icon="trash" onClick={() => handleDelete(r)}/>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* ── MODAL ── */}
      {modal && cfg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{ background: 'hsl(var(--card))', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {modal.mode === 'add' ? 'Add' : 'Edit'} {tab.replace(/s$/, '')}
              </span>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'hsl(var(--muted-foreground))', padding: 4 }}>
                <Icon name="x" size={16}/>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cfg.fields.map(f => (
                <div key={f.key}>
                  <label className="label">
                    {f.label}{f.required && <span style={{ color:'hsl(var(--destructive))', marginLeft: 2 }}>*</span>}
                  </label>
                  {f.type === 'select' ? (
                    <select className="input" value={draft[f.key]||''} onChange={e => setDraft(p => ({...p, [f.key]: e.target.value}))}>
                      {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={3}
                      value={draft[f.key]||''}
                      placeholder={f.placeholder||''}
                      onChange={e => setDraft(p => ({...p, [f.key]: e.target.value}))}
                      style={{ resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      className="input"
                      type={f.type}
                      value={draft[f.key]||''}
                      placeholder={f.placeholder||''}
                      onChange={e => setDraft(p => ({...p, [f.key]: e.target.value}))}
                    />
                  )}
                </div>
              ))}
              {saveErr && (
                <div style={{ fontSize: 12.5, color: 'hsl(var(--destructive))', padding: '8px 10px', borderRadius: 6, background: 'hsl(var(--destructive)/0.08)' }}>{saveErr}</div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid hsl(var(--border))', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn variant="brand" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
