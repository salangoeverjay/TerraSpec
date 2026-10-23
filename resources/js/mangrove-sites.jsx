import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Badge } from './components.jsx';
import { MANGROVE_LEGEND } from './map-layers.jsx';

const ha = value => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
const pct = value => `${Math.round(value * 100)}%`;
const statusOf = value => MANGROVE_LEGEND.find(l => l.val === value);

const label = { fontSize: 10.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 };

function CheckCard({ check }) {
  const value = check.agreement ?? check.excluded_share;
  const good = check.agreement != null && check.agreement >= 0.9;
  return (
    <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14 }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{check.label}</span>
        <Badge variant={check.agreement == null ? 'warn' : good ? 'brand' : 'destructive'}>
          {check.agreement == null ? `${pct(value)} excluded` : `${pct(value)} agree`}
        </Badge>
      </div>
      <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>{check.detail}</div>
    </div>
  );
}

/**
 * Actual mangrove reforestation sites and how TerraSpec's results compare with them
 * (zoning agreement, species agreement, terrestrial AHP-WLC model).
 */
export function MangroveSitesPanel({ onSelectBarangay }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/reforestation/sites', { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(json => setData(json.data))
      .catch(() => setError('Could not load the mangrove reforestation sites.'));
  }, []);

  if (error) return <Card><CardBody><div style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</div></CardBody></Card>;
  if (!data) return <Card><CardBody><div className="muted" style={{ fontSize: 13 }}>Loading mangrove reforestation sites…</div></CardBody></Card>;
  if (data.summary.site_count === 0) return null;

  const { summary, checks, sites } = data;

  return (
    <Card style={{ marginTop: 20 }}>
      <CardHeader>
        <div className="row-between" style={{ width: '100%' }}>
          <span className="card-title">Mangrove reforestation sites and validation</span>
          <span className="muted" style={{ fontSize: 12 }}>{summary.site_count} sites · {ha(summary.total_ha)}</span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-3" style={{ gap: 12, marginBottom: 18 }}>
          {MANGROVE_LEGEND.map(s => (
            <div key={s.val} style={{ borderLeft: `4px solid ${s.hex}`, padding: '6px 12px', background: 'hsl(var(--muted) / 0.35)', borderRadius: 6 }}>
              <div style={{ fontSize: 11.5 }} className="muted">{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{ha(summary.by_status[s.val]?.area_ha ?? 0)}</div>
              <div className="muted" style={{ fontSize: 11 }}>{summary.by_status[s.val]?.count ?? 0} sites</div>
            </div>
          ))}
        </div>

        <div style={label}>Validation of TerraSpec results against the actual sites</div>
        <div className="grid grid-2" style={{ gap: 12, marginBottom: 18 }}>
          <CheckCard check={checks.zoning}/>
          <CheckCard check={checks.terrestrial}/>
        </div>

        <div style={label}>Sites · click a row to see that barangay's mangrove species</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Site</th><th>Status</th><th>Year / adopter</th><th style={{ textAlign: 'right' }}>Area</th><th>Barangay</th>
                <th style={{ textAlign: 'right' }}>Mangrove sub-zone</th><th>Terrestrial AHP-WLC</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(site => {
                const status = statusOf(site.status);
                return (
                  <tr key={site.id} onClick={() => onSelectBarangay?.(site.zone_unit_id)} style={{ cursor: onSelectBarangay ? 'pointer' : 'default' }}>
                    <td style={{ fontWeight: 500 }}>{site.name}</td>
                    <td>
                      <span className="row" style={{ gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: status?.hex, flexShrink: 0 }}/>
                        {status?.label.replace(/ \(.*\)/, '') ?? site.status}
                      </span>
                    </td>
                    <td className="muted">{site.year ?? site.adopter ?? '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{ha(site.area_ha)}</td>
                    <td>{site.barangay}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{pct(site.mangrove_zone_share)}</td>
                    <td className="muted">{site.terrestrial_excluded ? 'Excluded (mangrove / built-up zones)' : `${site.terrestrial_pct}% ${site.terrestrial_level}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
          Source: {summary.source}. Most sites lie seaward of the PSA barangay
          boundary, on intertidal flats, so they are listed under the nearest barangay.
        </div>
      </CardBody>
    </Card>
  );
}

const ZONE_COLORS = {
  seaward: '#0369a1', middle: '#15803d', landward: '#a16207', riverine: '#7c3aed', back_mangrove: '#6b7280',
};
const PRIORITY = ['Vulnerable', 'Near threatened', 'Endangered', 'Critically endangered'];

/**
 * Mangrove species to plant (true mangroves and associates only), grouped by tidal zone, with the
 * planting rules and the site data still needed to assign species to each site.
 */
export function MangroveRecommendations({ data }) {
  return (
    <div style={{ padding: 18 }}>
      <div className="muted" style={{ fontSize: 12, lineHeight: 1.55, marginBottom: 14 }}>
        True mangroves and mangrove associates recorded in Davao del Norte. Plant each species only in its tidal zone;
        the zone of each site must still be confirmed in the field, so no species is assigned to a specific site yet.
      </div>

      <div className="stack" style={{ gap: 14 }}>
        {data.zones.map(group => (
          <div key={group.key} style={{ borderLeft: `4px solid ${ZONE_COLORS[group.key] ?? '#6b7280'}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{group.label}</div>
            <div className="grid grid-3" style={{ gap: 10 }}>
              {group.species.map(sp => (
                <div key={sp.id} style={{ border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '9px 11px' }}>
                  <div className="row-between" style={{ gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{sp.local_name}</span>
                    {PRIORITY.includes(sp.iucn_status)
                      ? <Badge variant="warn">{sp.iucn_status}</Badge>
                      : <span className="muted" style={{ fontSize: 10.5 }}>{sp.category_label}</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, fontStyle: 'italic' }}>{sp.scientific_name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{sp.family} · {sp.habit}{PRIORITY.includes(sp.iucn_status) ? ` · ${sp.category_label}` : ` · IUCN ${sp.iucn_status}`}</div>
                  {sp.zone_note && <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>{sp.zone_note}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ gap: 14, marginTop: 18 }}>
        <div>
          <div style={label}>Planting rules</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
            {data.planting_rules.map(rule => <li key={rule}>{rule}</li>)}
          </ul>
        </div>
        <div>
          <div style={label}>Site data still needed</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
            {data.site_data_needed.map(item => <li key={item}>{item}</li>)}
          </ul>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
            Adjacent land soil: {data.adjacent_soil.dominant}. {data.adjacent_soil.note}
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
        Species: {data.source}. {data.zonation_note}
      </div>
    </div>
  );
}
