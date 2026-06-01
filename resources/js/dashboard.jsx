import React, { useState, useEffect, useMemo } from 'react';
import { loadConversations } from './data.js';
import { PANABO } from './data.js';
import { Icon, Btn, Card, CardHeader, CardBody, Badge } from './components.jsx';
import { Map, MapMarker, MarkerContent, MarkerTooltip } from '../../components/ui/map';

function DashboardMap({ onParcelClick }) {
  return (
    <Map
      center={[125.6847, 7.307]}
      zoom={12}
      minZoom={10}
      maxZoom={18}
      dragPan={false}
      scrollZoom={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      keyboard={false}
      dragRotate={false}
      className="h-full w-full"
    >
      <MapMarker longitude={125.6847} latitude={7.307}>
        <MarkerContent className="translate-y-[-8px]">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ background: 'hsl(var(--brand))', color: 'white', padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Panabo City</span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'hsl(var(--brand))', border: '2px solid white', boxShadow: '0 0 0 5px hsl(162 47% 39% / 0.2)' }}/>
          </div>
        </MarkerContent>
        <MarkerTooltip>Panabo City, Davao del Norte</MarkerTooltip>
      </MapMarker>

      {PANABO.parcels.map(p => {
        const zone = PANABO.zones.find(z => z.id === p.zone);
        return (
          <MapMarker key={p.id} longitude={p.lng} latitude={p.lat} onClick={() => onParcelClick(p.id)}>
            <MarkerContent>
              <div style={{ width: 13, height: 13, borderRadius: '50%', background: zone?.hex ?? 'hsl(var(--brand))', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.35)', cursor: 'pointer' }}/>
            </MarkerContent>
            <MarkerTooltip>{p.id} · {p.barangay} · {p.score}%</MarkerTooltip>
          </MapMarker>
        );
      })}
    </Map>
  );
}

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function levelVariant(level) {
  if (level === 'Highly Suitable')     return 'brand';
  if (level === 'Moderately Suitable') return 'warn';
  return 'destructive';
}

export function DashboardScreen({ go }) {
  const [rankings, setRankings]         = useState([]);
  const [avgScore, setAvgScore]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [stats, setStats]               = useState(null);

  useEffect(() => {
    fetch('/suitability/rankings?analysis_type=commercial')
      .then(r => r.json())
      .then(json => { setRankings(json.data ?? []); setAvgScore(json.avg_score ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/dashboard-stats')
      .then(r => r.json())
      .then(json => setStats(json))
      .catch(() => {});
  }, []);

  const top5          = rankings.slice(0, 5);
  const zoneUnitCount = stats?.zone_count   ?? rankings.length ?? 40;
  const displayAvg    = avgScore !== null    ? `${avgScore}%`  : '—';
  const flaggedCount  = stats?.flagged_count ?? '…';
  const activeReports = stats?.report_count  ?? '…';
  const restrictions  = stats?.restrictions  ?? [];
  const topSpecies    = stats?.species       ?? [];

  const recentQueries = useMemo(() => {
    const convs = loadConversations();
    const result = [];
    const sorted = [...convs].sort((a, b) => {
      const ta = parseInt(a.id.split('-')[0], 10) || 0;
      const tb = parseInt(b.id.split('-')[0], 10) || 0;
      return tb - ta;
    });
    for (const conv of sorted) {
      const userMsgs = conv.messages.filter(m => m.role === 'user');
      if (userMsgs.length > 0) {
        const ts = parseInt(conv.id.split('-')[0], 10) || 0;
        result.push({ id: `q-${conv.id}`, convId: conv.id, text: userMsgs[userMsgs.length - 1].content, ts });
      }
      if (result.length >= 4) break;
    }
    return result;
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Panabo City Geospatial Decision Support · {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Btn variant="brand" icon="map" onClick={() => go('map')}>Open Map</Btn>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Zone Units',       value: zoneUnitCount,  icon: 'pin',   sub: '40 barangays · Panabo City' },
          { label: 'Avg Suitability',  value: displayAvg,     icon: 'chart', sub: 'Commercial · AHP-WLC score' },
          { label: 'Flagged Areas',    value: flaggedCount,   icon: 'alert', sub: stats?.breakdown ? `Flood ${stats.breakdown.flood} · Landslide ${stats.breakdown.landslide} · Storm ${stats.breakdown.storm_surge}` : 'Hazard-flagged zones' },
          { label: 'Active Reports',   value: activeReports,  icon: 'file',  sub: 'Pending / Draft / Final' },
        ].map(s => (
          <Card key={s.label}>
            <CardBody>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <span className="muted" style={{ fontSize: 12.5 }}>{s.label}</span>
                <Icon name={s.icon} size={16} style={{ color: 'hsl(var(--brand))' }}/>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>{s.value}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{s.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Map Overview</span>
              <Btn sz="sm" variant="outline" icon="map" onClick={() => go('map')}>View Map</Btn>
            </div>
          </CardHeader>
          <div style={{ height: 240, position: 'relative' }}>
            <DashboardMap onParcelClick={(id) => go('map', { parcel: id })}/>
          </div>
          <CardBody style={{ paddingTop: 10 }}>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              {PANABO.zones.map(z => (
                <div key={z.id} className="row" style={{ gap: 5, fontSize: 11.5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: z.hex, opacity: 0.85, display: 'inline-block', flexShrink: 0 }}/>
                  <span>{z.name}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Top Suitability Scores</span>
              <div className="row" style={{ gap: 8 }}>
                <span className="muted" style={{ fontSize: 11 }}>Commercial</span>
                <Btn sz="sm" variant="outline" onClick={() => go('suitability')}>Full Analysis</Btn>
              </div>
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12.5 }}>Loading…</div>
            ) : top5.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12.5 }}>No data available</div>
            ) : top5.map((row, i) => (
              <div key={row.zone_unit_id} className="row-between" style={{ padding: '10px 18px', borderBottom: i < 4 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="muted mono" style={{ fontSize: 11, width: 18, textAlign: 'right' }}>#{row.rank}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{row.unit_name}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {row.unit_type} · {row.settlement_tier.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <Badge variant={levelVariant(row.suitability_level)}>{row.total_pct}%</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-3">
        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Recent AI Queries</span>
              <Btn sz="sm" variant="outline" onClick={() => go('chat')}>Open Chat</Btn>
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {recentQueries.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12.5 }}>No recent queries yet</div>
            ) : recentQueries.map(q => (
              <div key={q.id} style={{ padding: '10px 18px', borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }} onClick={() => {
                if (q.convId) { try { sessionStorage.setItem('ts-nav-conv', q.convId); } catch {} }
                go('chat', q.convId ? { initialConvId: q.convId } : {});
              }}>
                <span style={{ fontSize: 12.5, lineHeight: 1.4, flex: 1 }}>{q.text}</span>
                <span className="muted" style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{relativeTime(q.ts)}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><span className="card-title">Environmental Restrictions</span></CardHeader>
          <CardBody style={{ padding: 0 }}>
            {restrictions.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12.5 }}>Loading…</div>
            ) : restrictions.map((r, i) => (
              <div key={r.id} className="row" style={{ padding: '10px 18px', gap: 10, borderBottom: i < restrictions.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <Badge variant={r.severity === 'high' ? 'destructive' : r.severity === 'medium' ? 'warn' : ''}>{r.severity}</Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.name}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{r.type}</div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="row-between">
              <span className="card-title">Top Tree Species</span>
              <Btn sz="sm" variant="outline" onClick={() => go('reforestation')}>View All</Btn>
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {topSpecies.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12.5 }}>Loading…</div>
            ) : topSpecies.map((s, i) => (
              <div key={s.species_id} className="row-between" style={{ padding: '9px 18px', borderBottom: i < topSpecies.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.common_name}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{s.soil_preference?.split('/')[0].trim()}</div>
                </div>
                <Badge variant={s.salinity_level === 'High' ? 'brand' : s.salinity_level === 'Med' ? 'warn' : ''}>{s.salinity_level}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
