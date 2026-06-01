import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon, Btn, Card, CardHeader, CardBody, Inp } from './components.jsx';

// ── AHP constants ────────────────────────────────────────────────────────────
const AHP_RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45]; // n=0..9
const SAATY_OPTS = [
  { v: '9',   l: '9 — Extreme importance' },
  { v: '8',   l: '8' },
  { v: '7',   l: '7 — Very strong importance' },
  { v: '6',   l: '6' },
  { v: '5',   l: '5 — Strong importance' },
  { v: '4',   l: '4' },
  { v: '3',   l: '3 — Moderate importance' },
  { v: '2',   l: '2' },
  { v: '1',   l: '1 — Equal importance' },
  { v: '1/2', l: '1/2' },
  { v: '1/3', l: '1/3 — Moderate (inverse)' },
  { v: '1/4', l: '1/4' },
  { v: '1/5', l: '1/5 — Strong (inverse)' },
  { v: '1/6', l: '1/6' },
  { v: '1/7', l: '1/7 — Very strong (inverse)' },
  { v: '1/8', l: '1/8' },
  { v: '1/9', l: '1/9 — Extreme (inverse)' },
];

function parseScale(s) {
  if (typeof s === 'number') return s;
  if (s.includes('/')) { const [a, b] = s.split('/').map(Number); return a / b; }
  return Number(s);
}

function buildMatrix(upper, n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      return i < j ? parseScale(upper[i][j]) : 1 / parseScale(upper[j][i]);
    })
  );
}

function computeAHP(matrix) {
  const n = matrix.length;
  // Column sums
  const colSums = Array(n).fill(0);
  matrix.forEach(row => row.forEach((v, j) => { colSums[j] += v; }));
  // Priority vector (row averages of normalized matrix)
  const weights = matrix.map(row =>
    row.reduce((s, v, j) => s + v / colSums[j], 0) / n
  );
  // Weighted sum → λmax
  const lambdaMax =
    matrix.reduce((s, row, i) =>
      s + row.reduce((ss, v, j) => ss + v * weights[j], 0) / weights[i], 0
    ) / n;
  const ci = (lambdaMax - n) / (n - 1);
  const cr = n > 2 ? ci / AHP_RI[n] : 0;
  return {
    weights,
    lambdaMax: +lambdaMax.toFixed(4),
    ci:        +ci.toFixed(4),
    cr:        +cr.toFixed(4),
    valid:     cr <= 0.10,
  };
}

function defaultUpper(n) {
  return Array.from({ length: n }, () => Array(n).fill('1'));
}

// ── AHP Calculator component ─────────────────────────────────────────────────
function AhpCalculator({ criteria }) {
  const n = criteria.length;
  const TYPES = ['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'];
  const TYPE_LABELS = { commercial: 'Commercial', residential: 'Residential', industrial: 'Industrial', agricultural: 'Agricultural', reforestation: 'Reforestation' };

  const [analysisType, setAnalysisType] = useState('commercial');
  const [upper, setUpper]               = useState(() => defaultUpper(n));
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [saveErr, setSaveErr]           = useState('');

  // Reset matrix when n changes (shouldn't happen, but safety)
  useEffect(() => { setUpper(defaultUpper(n)); }, [n]);

  const matrix = useMemo(() => buildMatrix(upper, n), [upper, n]);
  const result = useMemo(() => computeAHP(matrix), [matrix]);

  function setCell(i, j, v) {
    setUpper(prev => {
      const next = prev.map(r => [...r]);
      next[i][j] = v;
      return next;
    });
    setSaved(false);
  }

  function reciprocalLabel(i, j) {
    // Show lower triangle reciprocal as fraction string
    const val = parseScale(upper[j][i]);
    if (val === 1) return '1';
    if (val >= 2 && Number.isInteger(val)) return `1/${val}`;
    const inv = 1 / val;
    if (Number.isInteger(inv)) return String(inv);
    return (1 / val).toFixed(2);
  }

  async function applyWeights() {
    if (!result.valid) return;
    setSaving(true); setSaveErr('');
    try {
      // Send full matrix to backend — backend re-validates CR and saves weights
      const res = await fetch('/api/admin/ahp/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ analysis_type: analysisType, matrix }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to apply weights.');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  const crOk  = result.valid;
  const crPct = (result.cr * 100).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardHeader>
          <div className="row-between">
            <div>
              <span className="card-title">AHP Pairwise Comparison Matrix</span>
              <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>Fill the upper triangle using Saaty's 1–9 scale</span>
            </div>
            <select className="input" value={analysisType} onChange={e => { setAnalysisType(e.target.value); setSaved(false); }} style={{ width: 190 }}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]} Analysis</option>)}
            </select>
          </div>
        </CardHeader>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 11, minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Criterion</th>
                {criteria.map((c, j) => (
                  <th key={j} style={{ textAlign: 'center', minWidth: 78, padding: '6px 3px', lineHeight: 1.3 }}>
                    {c.criteria_name.split(' ')[0]}
                  </th>
                ))}
                <th style={{ textAlign: 'center', color: 'hsl(var(--brand))', minWidth: 64 }}>AHP Weight</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontSize: 11.5, whiteSpace: 'nowrap' }}>{c.criteria_name}</td>
                  {criteria.map((_, j) => (
                    <td key={j} style={{ textAlign: 'center', padding: '4px 3px' }}>
                      {i === j ? (
                        <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>1</span>
                      ) : i < j ? (
                        <select
                          value={upper[i][j]}
                          onChange={e => setCell(i, j, e.target.value)}
                          style={{ width: 72, height: 28, fontSize: 11, borderRadius: 5, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', cursor: 'pointer', textAlign: 'center' }}
                        >
                          {SAATY_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                          {reciprocalLabel(i, j)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'hsl(var(--brand))', fontSize: 13 }}>
                    {(result.weights[i] * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Results bar */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'λmax', val: result.lambdaMax },
            { label: 'CI',   val: result.ci },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{val}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}>CR</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: crOk ? 'hsl(var(--brand))' : 'hsl(var(--destructive))' }}>
              {crPct}% {crOk ? '✓' : '✗'}
            </div>
          </div>
          <div style={{ flex: 1, fontSize: 12.5, color: crOk ? 'hsl(var(--brand))' : 'hsl(var(--destructive))' }}>
            {crOk
              ? `CR = ${crPct}% ≤ 10% — Comparisons are consistent. Weights are valid.`
              : `CR = ${crPct}% > 10% — Comparisons are inconsistent. Adjust values until CR ≤ 10%.`}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {saveErr && <span style={{ fontSize: 12, color: 'hsl(var(--destructive))' }}>{saveErr}</span>}
            {saved   && <span style={{ fontSize: 12, color: 'hsl(var(--brand))' }}>Applied to {TYPE_LABELS[analysisType]}.</span>}
            <Btn variant="brand" icon="check" disabled={!crOk || saving} onClick={applyWeights}>
              {saving ? 'Applying…' : `Apply to ${TYPE_LABELS[analysisType]}`}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Saaty scale legend */}
      <Card>
        <CardHeader><span className="card-title">Saaty Scale Reference</span></CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {[
              { v: '1',   d: 'Equal importance — two criteria contribute equally' },
              { v: '3',   d: 'Moderate importance — one slightly favoured over other' },
              { v: '5',   d: 'Strong importance — one strongly favoured' },
              { v: '7',   d: 'Very strong importance — dominance demonstrated practically' },
              { v: '9',   d: 'Extreme importance — highest possible affirmation' },
              { v: '2,4,6,8', d: 'Intermediate values between adjacent judgements' },
              { v: '1/n', d: 'Reciprocals — if row i has value x over column j, then j over i = 1/x' },
            ].map(({ v, d }) => (
              <div key={v} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 700, minWidth: 52, fontSize: 12.5, color: 'hsl(var(--brand))' }}>{v}</span>
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', lineHeight: 1.45 }}>{d}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

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
  const TABS = ['ahp', 'zones', 'criteria', 'restrictions', 'species', 'users'];
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
    const apiTab = t === 'ahp' ? 'criteria' : t;
    setLoading(true); setLoadErr(''); setFilter('');
    try {
      const json = await apiFetch('GET', `/${apiTab}`);
      const list = Array.isArray(json) ? json : [];
      setRows(list);
      if (t === 'criteria' || t === 'ahp') {
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
        {cfg?.canAdd && tab !== 'ahp' && (
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
            {t === 'ahp' ? 'AHP Matrix' : t === 'criteria' ? 'AHP Weights' : t}
          </div>
        ))}
      </div>

      {loadErr && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'hsl(var(--destructive)/0.1)', border: '1px solid hsl(var(--destructive)/0.25)', fontSize: 13, color: 'hsl(var(--destructive))' }}>
          {loadErr}
        </div>
      )}

      {/* ── CRITERIA WEIGHT MATRIX ── */}
      {/* ── AHP Matrix calculator ── */}
      {tab === 'ahp' && (
        loading
          ? <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading criteria…</div>
          : rows.length > 0
            ? <AhpCalculator criteria={rows}/>
            : <div style={{ padding: 40, textAlign: 'center' }} className="muted">No criteria found. Run database seeder first.</div>
      )}

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
