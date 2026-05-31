import React, { useState, useEffect } from 'react';
import { Btn, Card, CardHeader, CardBody, Badge } from './components.jsx';

function criteriaBar(value, max, label) {
  const pct = Math.round((value / max) * 100);
  return (
    <div key={label}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11 }}>{label}</span>
        <span className="mono muted" style={{ fontSize: 11 }}>{pct}%</span>
      </div>
      <div className="meter"><span style={{ width: `${pct}%` }}/></div>
    </div>
  );
}

function scoreVariant(pct) {
  if (pct >= 80) return 'brand';
  if (pct >= 55) return 'warn';
  return '';
}

function restrictionVariant(type) {
  if (type === 'Mangrove' || type === 'Watershed') return 'destructive';
  return 'warn';
}

function ZoneSelector({ zones, selectedId, onChange }) {
  return (
    <div>
      <label className="label">Select Barangay</label>
      <select
        className="input"
        value={selectedId ?? ''}
        onChange={e => onChange(Number(e.target.value))}
      >
        <option value="">— choose a barangay —</option>
        {zones.map(z => (
          <option key={z.zone_unit_id} value={z.zone_unit_id}>
            {z.unit_name} ({z.unit_type})
          </option>
        ))}
      </select>
    </div>
  );
}

function ZoneInfoPanel({ zone }) {
  if (!zone) return null;
  const rows = [
    ['Soil type',       zone.dominant_soil_type],
    ['Elevation',       `${zone.elevation_min}–${zone.elevation_max} m`],
    ['Salinity',        zone.salinity_level],
    ['Slope class',     zone.dominant_slope_class],
    ['Land capability', zone.land_capability_class],
    ['Area',            `${zone.total_area_ha} ha`],
  ];
  return (
    <div className="stack" style={{ gap: 8, marginTop: 14 }}>
      {rows.map(([k, v]) => (
        <div key={k} className="row-between" style={{ fontSize: 12.5 }}>
          <span className="muted">{k}</span>
          <span style={{ fontWeight: 500 }}>{v ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

function RestrictionList({ restrictions }) {
  if (!restrictions.length) return (
    <div className="muted" style={{ fontSize: 12.5, padding: '12px 0' }}>
      No environmental restrictions for this zone.
    </div>
  );
  return (
    <div className="stack" style={{ gap: 10 }}>
      {restrictions.map(r => (
        <div
          key={r.restriction_id}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'hsl(var(--destructive) / 0.07)',
            borderLeft: '3px solid hsl(var(--destructive))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Badge variant={restrictionVariant(r.restriction_type)}>{r.restriction_type}</Badge>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.restriction_name}</span>
          </div>
          <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>{r.description}</div>
        </div>
      ))}
    </div>
  );
}

function SpeciesCard({ sp }) {
  return (
    <Card style={{ background: 'hsl(var(--muted) / 0.3)' }}>
      <CardBody>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: 11 }}>#{sp.rank}</span>
          <Badge variant={scoreVariant(sp.score_pct)}>{sp.score_pct}%</Badge>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>
          {sp.common_name}
        </div>
        <div className="muted" style={{ fontSize: 11.5, fontStyle: 'italic', marginBottom: 10 }}>
          {sp.scientific_name}
        </div>

        <div className="stack" style={{ gap: 6, marginBottom: 10 }}>
          {criteriaBar(sp.criteria.soil,        0.35, 'Soil')}
          {criteriaBar(sp.criteria.elevation,   0.25, 'Elevation')}
          {criteriaBar(sp.criteria.salinity,    0.20, 'Salinity')}
          {criteriaBar(sp.criteria.temperature, 0.20, 'Temperature')}
        </div>

        <div className="stack" style={{ gap: 3, marginBottom: 8 }}>
          {[
            ['Soil pref.', sp.soil_preference],
            ['Elevation',  `${sp.elevation_range} m`],
            ['Salinity',   sp.salinity_level],
            ['Temp',       `${sp.temperature_range}°C`],
          ].map(([k, v]) => (
            <div key={k} className="row-between" style={{ fontSize: 11.5 }}>
              <span className="muted">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>

        <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          {sp.suitability_notes}
        </div>
      </CardBody>
    </Card>
  );
}

export function ReforestationScreen() {
  const [zones,        setZones]        = useState([]);
  const [selectedId,   setSelectedId]   = useState(null);
  const [zone,         setZone]         = useState(null);
  const [species,      setSpecies]      = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [error,        setError]        = useState(null);

  // Load zone list once
  useEffect(() => {
    fetch('/reforestation')
      .then(r => r.json())
      .then(json => setZones(json.zones ?? []))
      .catch(() => setError('Could not load zone list.'))
      .finally(() => setZonesLoading(false));
  }, []);

  // Load matches when zone changes
  useEffect(() => {
    if (!selectedId) {
      setZone(null);
      setSpecies([]);
      setRestrictions([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/reforestation/${selectedId}/match`)
      .then(r => r.json())
      .then(json => {
        setZone(json.zone ?? null);
        setSpecies(json.species ?? []);
        setRestrictions(json.restrictions ?? []);
      })
      .catch(() => setError('Could not load species matches.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const [exporting, setExporting] = useState(false);

  async function exportReport() {
    if (!selectedId) return;
    setExporting(true);
    try {
      const res = await fetch(`/reforestation/${selectedId}/pdf`);
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const name = zone?.unit_name
        ? `reforestation-plan-${zone.unit_name.toLowerCase().replace(/\s+/g, '-')}.pdf`
        : `reforestation-plan-${selectedId}.pdf`;
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reforestation Planning</h1>
          <p className="page-subtitle">
            Species suitability and site recommendations · Panabo City
          </p>
        </div>
        <Btn variant="outline" icon="download" onClick={exportReport} disabled={!selectedId || exporting}>
          {exporting ? 'Generating PDF…' : 'Export PDF'}
        </Btn>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {/* Left: zone selector + zone info */}
        <Card>
          <CardHeader><span className="card-title">Zone Parameters</span></CardHeader>
          <CardBody>
            {zonesLoading
              ? <div className="muted" style={{ fontSize: 12.5 }}>Loading zones…</div>
              : <ZoneSelector zones={zones} selectedId={selectedId} onChange={setSelectedId}/>
            }
            <ZoneInfoPanel zone={zone}/>
          </CardBody>
        </Card>

        {/* Right: restrictions */}
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Environmental Restrictions</span>
              {restrictions.length > 0 && (
                <Badge variant="destructive">{restrictions.length} active</Badge>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {loading
              ? <div className="muted" style={{ fontSize: 12.5 }}>Loading…</div>
              : !selectedId
              ? <div className="muted" style={{ fontSize: 12.5 }}>Select a barangay to check restrictions.</div>
              : <RestrictionList restrictions={restrictions}/>
            }
          </CardBody>
        </Card>
      </div>

      {/* Species results */}
      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title">
              Recommended Species
              {zone ? ` — ${zone.unit_name}` : ''}
            </span>
            {!loading && species.length > 0 && (
              <Badge variant="brand">{species.length} matched</Badge>
            )}
          </div>
        </CardHeader>

        {error && (
          <div style={{ padding: '16px 18px', color: 'hsl(var(--destructive))', fontSize: 13 }}>
            {error}
          </div>
        )}

        {!selectedId && !error && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
            Select a barangay above to see recommended species.
          </div>
        )}

        {selectedId && loading && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
            Calculating species suitability…
          </div>
        )}

        {!loading && selectedId && species.length === 0 && !error && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
            No species matched for this zone.
          </div>
        )}

        {!loading && species.length > 0 && (
          <div className="grid grid-3" style={{ padding: 18, gap: 14 }}>
            {species.map(sp => <SpeciesCard key={sp.species_id} sp={sp}/>)}
          </div>
        )}
      </Card>
    </div>
  );
}
