<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size:11px; color:#1a1a1a; background:#fff; padding:32px 36px; }

  .header { border-bottom:2.5px solid #16a34a; padding-bottom:14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-end; }
  .header-left h1 { font-size:17px; font-weight:700; color:#16a34a; letter-spacing:-0.02em; }
  .header-left p  { font-size:11px; color:#6b7280; margin-top:3px; }
  .header-right   { text-align:right; font-size:10px; color:#6b7280; line-height:1.7; }

  .disclaimer { background:#fefce8; border:1px solid #fde047; border-radius:5px; padding:7px 12px; font-size:10px; color:#854d0e; margin-bottom:16px; }

  .stat-row { display:flex; gap:10px; margin-bottom:18px; }
  .stat-box { flex:1; border-radius:7px; padding:12px 14px; }
  .stat-box.flood    { background:#fef2f2; border:1px solid #fecaca; }
  .stat-box.restrict { background:#fefce8; border:1px solid #fde047; }
  .stat-box.protect  { background:#f0fdf4; border:1px solid #bbf7d0; }
  .stat-label { font-size:9.5px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; margin-bottom:5px; }
  .stat-value { font-size:26px; font-weight:700; }
  .stat-box.flood    .stat-value { color:#b91c1c; }
  .stat-box.restrict .stat-value { color:#854d0e; }
  .stat-box.protect  .stat-value { color:#15803d; }
  .stat-sub { font-size:10px; color:#6b7280; margin-top:3px; line-height:1.4; }

  .section       { margin-bottom:20px; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#16a34a; border-bottom:1px solid #e5e7eb; padding-bottom:5px; margin-bottom:10px; }

  .restriction-box  { background:#fef2f2; border-left:3px solid #ef4444; border-radius:4px; padding:9px 12px; margin-bottom:8px; }
  .restriction-type { display:inline-block; font-size:9px; font-weight:700; padding:1px 6px; border-radius:4px; margin-bottom:4px; }
  .type-mangrove    { background:#dcfce7; color:#166534; }
  .type-watershed   { background:#dbeafe; color:#1e40af; }
  .type-safdz       { background:#fef9c3; color:#854d0e; }
  .type-other       { background:#f3f4f6; color:#374151; }
  .restriction-name { font-size:11.5px; font-weight:600; margin-bottom:3px; }
  .restriction-desc { font-size:10.5px; color:#6b7280; line-height:1.5; margin-bottom:5px; }
  .zone-chips       { display:flex; flex-wrap:wrap; gap:4px; }
  .zone-chip        { font-size:9.5px; padding:1px 6px; background:#f3f4f6; border-radius:4px; color:#374151; }

  .data-table     { width:100%; border-collapse:collapse; font-size:10.5px; }
  .data-table th  { background:#f0fdf4; color:#166534; font-size:9.5px; text-transform:uppercase; letter-spacing:0.06em; padding:7px 8px; text-align:left; border-bottom:1.5px solid #bbf7d0; }
  .data-table td  { padding:6px 8px; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
  .data-table tr:last-child td { border-bottom:none; }

  .badge          { display:inline-block; font-size:9px; font-weight:700; padding:2px 7px; border-radius:99px; }
  .badge-critical { background:#fee2e2; color:#b91c1c; }
  .badge-elevated { background:#fef9c3; color:#854d0e; }
  .badge-urban    { background:#dbeafe; color:#1e40af; }
  .badge-rural    { background:#f3f4f6; color:#374151; }
  .flag-yes       { color:#b91c1c; font-weight:700; font-size:10px; }
  .flag-no        { color:#d1d5db; font-size:10px; }

  .footer { border-top:1px solid #e5e7eb; padding-top:10px; margin-top:24px; display:flex; justify-content:space-between; font-size:9.5px; color:#9ca3af; }
</style>
</head>
<body>

{{-- HEADER --}}
<div class="header">
  <div class="header-left">
    <h1>TerraSpec — City-Wide Environmental Assessment</h1>
    <p>Panabo City, Davao del Norte · City Planning and Development Office (CPDO)</p>
  </div>
  <div class="header-right">
    <div><strong>Report ID:</strong> {{ $report_id }}</div>
    <div><strong>Generated:</strong> {{ $generated_at }}</div>
    <div><strong>Prepared by:</strong> CPDO Panabo City</div>
  </div>
</div>

{{-- DISCLAIMER --}}
<div class="disclaimer">
  This document is for decision-support purposes only. All environmental flags and restriction data must be
  verified with the City Environment and Natural Resources Office (CENRO) before use in regulatory decisions.
</div>

{{-- STAT SUMMARY --}}
<div class="stat-row">
  <div class="stat-box flood">
    <div class="stat-label">High Flood Susceptibility</div>
    <div class="stat-value">{{ $flood_risk_count }}</div>
    <div class="stat-sub">Barangays with High flood area (CLUP Table PF-19)</div>
  </div>
  <div class="stat-box restrict">
    <div class="stat-label">Landslide / Liquefaction</div>
    <div class="stat-value">{{ $landslide_count }} / {{ $liquefaction_count }}</div>
    <div class="stat-sub">Barangays with landslide area (MGB 2020) / highly susceptible liquefaction (PF-26)</div>
  </div>
  <div class="stat-box protect">
    <div class="stat-label">Protected Barangays</div>
    <div class="stat-value">{{ $protected_count }}</div>
    <div class="stat-sub">Mangrove, forest reserve or mangrove site restriction</div>
  </div>
</div>

{{-- ENVIRONMENTAL RESTRICTIONS --}}
<div class="section">
  <div class="section-title">Environmental Restrictions ({{ $restricted_count }} barangays restricted)</div>
  @foreach($restrictions as $r)
  <div class="restriction-box">
    <div>
      <span class="restriction-type {{ $r['level'] === 'protected' ? 'type-mangrove' : 'type-safdz' }}">{{ ucfirst($r['level']) }} · {{ $r['restriction_type'] }}</span>
    </div>
    <div class="restriction-name">{{ $r['restriction_name'] }}</div>
    <div class="restriction-desc">{{ $r['description'] }}</div>
    <div class="zone-chips">
      @foreach($r['zones'] as $z)
        <span class="zone-chip">{{ $z }}</span>
      @endforeach
    </div>
  </div>
  @endforeach
  <div style="font-size:9.5px;color:#6b7280">Source: {{ $sources['restrictions'] }}.</div>
</div>

{{-- HIGH FLOOD --}}
<div class="section">
  <div class="section-title">High Flood Susceptibility ({{ count($flood_zones) }} Barangays)</div>
  <table class="data-table">
    <thead>
      <tr><th>#</th><th>Barangay</th><th>Type</th><th>High Flood Area</th><th>Share of Barangay (PF-19)</th></tr>
    </thead>
    <tbody>
      @foreach($flood_zones as $i => $z)
      <tr>
        <td style="color:#9ca3af">{{ $i + 1 }}</td>
        <td style="font-weight:600">{{ $z['unit_name'] }}</td>
        <td><span class="badge {{ $z['unit_type'] === 'Urban' ? 'badge-urban' : 'badge-rural' }}">{{ $z['unit_type'] }}</span></td>
        <td style="font-weight:600;font-family:monospace">{{ number_format($z['flood_high_ha'], 2) }} ha</td>
        <td style="font-family:monospace">{{ number_format($z['flood_high_share'] * 100, 1) }}%</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>

{{-- HAZARDS BY BARANGAY --}}
<div class="section">
  <div class="section-title">Hazards by Barangay (hectares)</div>
  <table class="data-table">
    <thead>
      <tr><th>Barangay</th><th style="text-align:right">Flood (High)</th><th style="text-align:right">Flood (any)</th><th style="text-align:right">Landslide High / Moderate</th><th style="text-align:right">Liquefaction HSA</th></tr>
    </thead>
    <tbody>
      @foreach($hazards as $z)
      <tr>
        <td style="font-weight:600">{{ $z['unit_name'] }}</td>
        <td style="text-align:right;font-family:monospace">{{ $z['flood_high_ha'] > 0 ? number_format($z['flood_high_ha'], 1) : '—' }}</td>
        <td style="text-align:right;font-family:monospace">{{ $z['flood_any_ha'] > 0 ? number_format($z['flood_any_ha'], 1) : '—' }}</td>
        <td style="text-align:right;font-family:monospace">{{ $z['landslide_high_ha'] + $z['landslide_moderate_ha'] > 0 ? number_format($z['landslide_high_ha'], 1).' / '.number_format($z['landslide_moderate_ha'], 1) : '—' }}</td>
        <td style="text-align:right;font-family:monospace">{{ $z['liquefaction_hsa_ha'] > 0 ? number_format($z['liquefaction_hsa_ha'], 1) : '—' }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
  <div style="font-size:9.5px;color:#6b7280;margin-top:6px">Flood: {{ $sources['flood'] }}. Landslide: {{ $sources['landslide'] }}. Liquefaction: {{ $sources['liquefaction'] }}. {{ $not_loaded }}</div>
</div>

{{-- SUB-WATERSHEDS --}}
<div class="section">
  <div class="section-title">Sub-Watersheds (CLUP Tables PF-4 and PF-5)</div>
  @foreach($watersheds as $w)
  <div class="restriction-box">
    <div class="restriction-name">{{ $w['name'] }} · {{ number_format($w['area_ha'], 2) }} ha ({{ $w['share_pct'] }}%)</div>
    <div class="zone-chips">
      @foreach($w['barangays'] as $b)<span class="zone-chip">{{ $b }}</span>@endforeach
    </div>
  </div>
  @endforeach
</div>
{{-- FOOTER --}}
<div class="footer">
  <div>TerraSpec DSS · Panabo City CLUP 2020–2029 · Data: CLUP 2020–2029 (PF-4, PF-5, PF-19, PF-26), MGB 2020 maps, Integrated Zoning Map, PSA 2023 boundaries</div>
  <div>{{ $report_id }} · {{ $generated_at }}</div>
</div>

</body>
</html>
