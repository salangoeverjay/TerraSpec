import React, { useState, useEffect } from 'react';
import { Btn, Card, CardHeader, CardBody, Badge } from './components.jsx';
import { MangroveSitesPanel, MangroveRecommendations } from './mangrove-sites.jsx';

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

export function ReforestationScreen() {
  const [zones,        setZones]        = useState([]);
  const [selectedId,   setSelectedId]   = useState(null);
  const [zone,         setZone]         = useState(null);
  const [mangrove,     setMangrove]     = useState(null);
  const [restrictions, setRestrictions] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [error,        setError]        = useState(null);
  const [studyArea,    setStudyArea]    = useState(null);

  // Load zone list once
  useEffect(() => {
    fetch('/reforestation')
      .then(r => r.json())
      .then(json => { setZones(json.zones ?? []); setStudyArea(json.study_area ?? null); })
      .catch(() => setError('Could not load zone list.'))
      .finally(() => setZonesLoading(false));
  }, []);

  // Load matches when zone changes
  useEffect(() => {
    if (!selectedId) {
      setZone(null);
      setMangrove(null);
      setRestrictions([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/reforestation/${selectedId}/match`)
      .then(r => r.json())
      .then(json => {
        setZone(json.zone ?? null);
        setMangrove(json.mangrove ?? null);
        setRestrictions(json.restrictions ?? []);
      })
      .catch(() => setError('Could not load mangrove species.'))
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
            Mangrove species and reforestation sites · Panabo City
          </p>
          {studyArea && (
            <p className="muted" style={{ fontSize: 12, marginTop: 4, maxWidth: 760 }}>{studyArea.note}</p>
          )}
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

      {/* Mangrove species (true mangroves and associates only) */}
      <Card>
        <CardHeader>
          <div className="row-between">
            <span className="card-title">
              Recommended Mangrove Species
              {zone ? ` — ${zone.unit_name}` : ''}
            </span>
            {!loading && mangrove && (
              <Badge variant="brand">{mangrove.species.length} species · {mangrove.zones.length} tidal zones</Badge>
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
            Select a barangay above to see the mangrove species to plant.
          </div>
        )}

        {selectedId && loading && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
            Loading mangrove species…
          </div>
        )}

        {!loading && mangrove && <MangroveRecommendations data={mangrove}/>}
      </Card>

      <MangroveSitesPanel onSelectBarangay={id => { setSelectedId(id); window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}/>
    </div>
  );
}
