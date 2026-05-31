<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size:11px; color:#1a1a1a; background:#fff; padding:32px 36px; }

  .header { border-bottom:2.5px solid #16a34a; padding-bottom:14px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-end; }
  .header-left h1 { font-size:17px; font-weight:700; color:#16a34a; letter-spacing:-0.02em; }
  .header-left p  { font-size:11px; color:#6b7280; margin-top:3px; }
  .header-right   { text-align:right; font-size:10px; color:#6b7280; line-height:1.7; }

  .disclaimer { background:#fefce8; border:1px solid #fde047; border-radius:5px; padding:7px 12px; font-size:10px; color:#854d0e; margin-bottom:16px; }

  .meta-grid { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
  .meta-box  { flex:1; min-width:100px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:9px 12px; }
  .meta-box-label { font-size:9.5px; color:#6b7280; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; }
  .meta-box-value { font-size:13px; font-weight:700; color:#15803d; }
  .meta-box-value.warn { color:#b45309; }
  .meta-box-value.danger { color:#b91c1c; }

  .section       { margin-bottom:20px; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#16a34a; border-bottom:1px solid #e5e7eb; padding-bottom:5px; margin-bottom:10px; }

  .info-table     { width:100%; border-collapse:collapse; font-size:11px; }
  .info-table td  { padding:5px 8px; border-bottom:1px solid #f3f4f6; }
  .info-table td:first-child { color:#6b7280; width:38%; }
  .info-table td:last-child  { font-weight:600; }

  .score-table    { width:100%; border-collapse:collapse; font-size:10.5px; }
  .score-table th { background:#f0fdf4; color:#166534; font-size:9.5px; text-transform:uppercase; letter-spacing:0.06em; padding:7px 8px; text-align:left; border-bottom:1.5px solid #bbf7d0; }
  .score-table td { padding:7px 8px; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
  .score-table tr:last-child td { border-bottom:none; }

  .bar-wrap { background:#e5e7eb; border-radius:99px; height:5px; width:80px; display:inline-block; vertical-align:middle; margin-left:8px; }
  .bar-fill { border-radius:99px; height:5px; }
  .bar-high { background:#16a34a; }
  .bar-mid  { background:#d97706; }
  .bar-low  { background:#9ca3af; }

  .rank-badge    { display:inline-block; background:#16a34a; color:#fff; font-size:9px; font-weight:700; padding:1px 6px; border-radius:99px; }
  .level-badge   { display:inline-block; font-size:9.5px; font-weight:700; padding:2px 8px; border-radius:99px; }
  .level-high    { background:#dcfce7; color:#15803d; }
  .level-mod     { background:#fef9c3; color:#854d0e; }
  .level-low     { background:#fee2e2; color:#b91c1c; }

  .hazard-row    { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
  .hazard-box    { flex:1; min-width:120px; border-radius:6px; padding:9px 12px; font-size:10.5px; }
  .hazard-yes    { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; }
  .hazard-no     { background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; }
  .hazard-label  { font-size:9px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px; }
  .hazard-value  { font-weight:700; font-size:12px; }

  .restriction-box  { background:#fef2f2; border-left:3px solid #ef4444; border-radius:4px; padding:8px 12px; margin-bottom:8px; }
  .restriction-type { display:inline-block; background:#fee2e2; color:#b91c1c; font-size:9px; font-weight:700; padding:1px 6px; border-radius:4px; margin-bottom:4px; }
  .restriction-name { font-size:11px; font-weight:600; margin-bottom:3px; }
  .restriction-desc { font-size:10px; color:#6b7280; line-height:1.5; }
  .no-restriction   { color:#16a34a; font-size:11px; padding:8px 0; }

  .ranking-table    { width:100%; border-collapse:collapse; font-size:10.5px; }
  .ranking-table th { background:#1a1a1a; color:#fff; padding:7px 9px; text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; }
  .ranking-table td { padding:6px 9px; border-bottom:1px solid #f3f4f6; }
  .ranking-table tr:nth-child(even) td { background:#f9fafb; }

  .footer { border-top:1px solid #e5e7eb; padding-top:10px; margin-top:24px; display:flex; justify-content:space-between; font-size:9.5px; color:#9ca3af; }
</style>
</head>
<body>

{{-- ── HEADER ── --}}
<div class="header">
  <div class="header-left">
    <h1>TerraSpec — {{ $report_type }}</h1>
    <p>Panabo City, Davao del Norte · City Planning and Development Office (CPDO)</p>
  </div>
  <div class="header-right">
    <div><strong>Report ID:</strong> {{ $report_id }}</div>
    <div><strong>Generated:</strong> {{ $generated_at }}</div>
    <div><strong>Prepared by:</strong> CPDO Panabo City</div>
  </div>
</div>

{{-- ── DISCLAIMER ── --}}
<div class="disclaimer">
  This document is for decision-support purposes only. All suitability scores and recommendations lack legal finality
  and must be verified by the City Planning and Development Office before use in regulatory decisions.
</div>

{{-- ── SUMMARY META BOXES ── --}}
@if($zone)
<div class="meta-grid">
  <div class="meta-box">
    <div class="meta-box-label">Barangay</div>
    <div class="meta-box-value">{{ $zone->unit_name }}</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Classification</div>
    <div class="meta-box-value">{{ $zone->unit_type }}</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Area</div>
    <div class="meta-box-value">{{ number_format($zone->total_area_ha, 1) }} ha</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Settlement Tier</div>
    <div class="meta-box-value">{{ str_replace('_',' ', $zone->settlement_tier) }}</div>
  </div>
  @if(isset($total_pct))
  <div class="meta-box">
    <div class="meta-box-label">Suitability Score</div>
    <div class="meta-box-value {{ $total_pct >= 75 ? '' : ($total_pct >= 50 ? 'warn' : 'danger') }}">{{ $total_pct }}%</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Classification</div>
    <div class="meta-box-value {{ $total_pct >= 75 ? '' : ($total_pct >= 50 ? 'warn' : 'danger') }}">{{ $suitability_level }}</div>
  </div>
  @endif
</div>
@endif

{{-- ── EXECUTIVE SUMMARY ── --}}
@if(in_array('Executive Summary', $sections) && $zone)
<div class="section">
  <div class="section-title">Executive Summary</div>
  <table class="info-table">
    <tr><td>Barangay / Zone Unit</td><td>{{ $zone->unit_name }}</td></tr>
    <tr><td>Report Type</td><td>{{ $report_type }}</td></tr>
    <tr><td>Land Classification</td><td>{{ $zone->unit_type }} — {{ str_replace('_',' ', $zone->settlement_tier) }}</td></tr>
    <tr><td>Total Area</td><td>{{ number_format($zone->total_area_ha, 2) }} hectares</td></tr>
    <tr><td>Population (2020)</td><td>{{ number_format($zone->population_2020) }}</td></tr>
    <tr><td>Population Density</td><td>{{ number_format($zone->population_density, 1) }} persons/ha</td></tr>
    <tr><td>Dominant Soil Type</td><td>{{ $zone->dominant_soil_type ?? '—' }}</td></tr>
    <tr><td>Dominant Slope Class</td><td>{{ $zone->dominant_slope_class ? $zone->dominant_slope_class.'°' : '—' }}</td></tr>
    <tr><td>Land Capability Class</td><td>{{ $zone->land_capability_class ?? '—' }}</td></tr>
    <tr><td>Elevation Range</td><td>{{ $zone->elevation_min }}–{{ $zone->elevation_max }} m asl</td></tr>
    <tr><td>Salinity Level</td><td>{{ $zone->salinity_level }}</td></tr>
    @if(isset($total_pct))
    <tr><td>Overall Suitability Score</td><td><strong>{{ $total_pct }}% — {{ $suitability_level }}</strong></td></tr>
    @endif
  </table>
</div>
@endif

{{-- ── MCDA SCORES ── --}}
@if(in_array('MCDA Scores', $sections) && isset($criteria_breakdown))
<div class="section">
  <div class="section-title">MCDA Scores — {{ ucfirst($analysis_type) }} Analysis</div>
  <table class="score-table">
    <thead>
      <tr>
        <th>Criterion</th>
        <th>Raw Score</th>
        <th>Weight</th>
        <th>Weighted Score</th>
        <th>Bar</th>
      </tr>
    </thead>
    <tbody>
      @foreach($criteria_breakdown as $criterion => $vals)
      @php $pct = round($vals['score'] * 100); @endphp
      <tr>
        <td style="font-weight:600">{{ $criterion }}</td>
        <td>{{ $pct }}%</td>
        <td>{{ round($vals['weight'] * 100) }}%</td>
        <td><strong>{{ round($vals['weighted'] * 100, 1) }}%</strong></td>
        <td>
          <div class="bar-wrap">
            <div class="bar-fill {{ $pct >= 75 ? 'bar-high' : ($pct >= 50 ? 'bar-mid' : 'bar-low') }}" style="width:{{ $pct }}%"></div>
          </div>
        </td>
      </tr>
      @endforeach
    </tbody>
    <tfoot>
      <tr style="background:#f0fdf4;">
        <td colspan="3" style="font-weight:700;color:#166534">TOTAL SUITABILITY SCORE</td>
        <td style="font-weight:700;font-size:13px;color:#166534">{{ $total_pct }}%</td>
        <td>
          <span class="level-badge {{ $total_pct >= 75 ? 'level-high' : ($total_pct >= 50 ? 'level-mod' : 'level-low') }}">
            {{ $suitability_level }}
          </span>
        </td>
      </tr>
    </tfoot>
  </table>
</div>
@endif

{{-- ── ENVIRONMENTAL FLAGS ── --}}
@if(in_array('Environmental Flags', $sections))
<div class="section">
  <div class="section-title">Environmental Restrictions</div>
  @if($restrictions->count() > 0)
    @foreach($restrictions as $r)
    <div class="restriction-box">
      <div><span class="restriction-type">{{ $r->restriction_type }}</span></div>
      <div class="restriction-name">{{ $r->restriction_name }}</div>
      <div class="restriction-desc">{{ $r->description }}</div>
    </div>
    @endforeach
  @else
    <div class="no-restriction">✓ No environmental restrictions recorded for this zone.</div>
  @endif
</div>
@endif

{{-- ── HAZARD DATA ── --}}
@if(in_array('Hazard Data', $sections) && $hazard)
<div class="section">
  <div class="section-title">Hazard Assessment</div>
  <div class="hazard-row">
    @php
      $flags = [
        ['Flood',        $hazard->has_flood],
        ['Landslide',    $hazard->has_landslide],
        ['Storm Surge',  $hazard->has_storm_surge],
        ['Drought',      $hazard->has_drought],
        ['Sea Level Rise',$hazard->has_sea_level_rise],
      ];
    @endphp
    @foreach($flags as [$label, $flag])
    <div class="hazard-box {{ $flag ? 'hazard-yes' : 'hazard-no' }}">
      <div class="hazard-label">{{ $label }}</div>
      <div class="hazard-value">{{ $flag ? 'PRESENT' : 'None' }}</div>
    </div>
    @endforeach
  </div>
  <table class="info-table" style="margin-top:8px">
    <tr><td>Flood — High Susceptibility</td><td>{{ number_format($hazard->flood_high_ha, 2) }} ha</td></tr>
    <tr><td>Flood — Moderate</td><td>{{ number_format($hazard->flood_moderate_ha, 2) }} ha</td></tr>
    <tr><td>Flood — Low</td><td>{{ number_format($hazard->flood_low_ha, 2) }} ha</td></tr>
    <tr><td>Liquefaction — High Susceptibility</td><td>{{ number_format($hazard->liquefaction_hsa_ha, 2) }} ha</td></tr>
    <tr><td>Liquefaction — Moderate</td><td>{{ number_format($hazard->liquefaction_msa_ha, 2) }} ha</td></tr>
    <tr><td>Storm Surge — High</td><td>{{ number_format($hazard->storm_surge_high_ha, 2) }} ha</td></tr>
  </table>
</div>
@endif

{{-- ── ZONE COMPLIANCE ── --}}
@if(in_array('Zone Compliance', $sections) && $zone)
<div class="section">
  <div class="section-title">Zone Compliance</div>
  <table class="info-table">
    <tr><td>Unit Type</td><td>{{ $zone->unit_type }}</td></tr>
    <tr><td>Land Capability Class</td><td>{{ $zone->land_capability_class ?? '—' }}</td></tr>
    <tr><td>Settlement Tier</td><td>{{ str_replace('_',' ', $zone->settlement_tier) }}</td></tr>
    <tr><td>Market Saturation Index</td><td>{{ number_format($zone->saturation_index * 100, 1) }}%</td></tr>
    <tr><td>Environmental Restrictions</td><td>{{ $restrictions->count() > 0 ? $restrictions->count().' restriction(s) active' : 'None' }}</td></tr>
  </table>
</div>
@endif

{{-- ── REFORESTATION SPECIES ── --}}
@if(in_array('Recommendations', $sections) && $report_type === 'Reforestation Plan' && isset($species) && count($species))
<div class="section">
  <div class="section-title">Recommended Tree Species (AHP-WLC Matched)</div>
  <table class="score-table">
    <thead>
      <tr><th>#</th><th>Common Name</th><th>Scientific Name</th><th>Match Score</th><th>Soil</th><th>Salinity</th></tr>
    </thead>
    <tbody>
      @foreach($species as $sp)
      <tr>
        <td><span class="rank-badge">{{ $sp['rank'] }}</span></td>
        <td style="font-weight:600">{{ $sp['common_name'] }}</td>
        <td style="font-style:italic;color:#6b7280">{{ $sp['scientific_name'] }}</td>
        <td>
          <strong class="{{ $sp['score_pct'] >= 80 ? '' : '' }}" style="color:{{ $sp['score_pct'] >= 75 ? '#16a34a' : ($sp['score_pct'] >= 50 ? '#d97706' : '#6b7280') }}">{{ $sp['score_pct'] }}%</strong>
          <div class="bar-wrap"><div class="bar-fill {{ $sp['score_pct'] >= 75 ? 'bar-high' : 'bar-mid' }}" style="width:{{ $sp['score_pct'] }}%"></div></div>
        </td>
        <td>{{ $sp['soil_preference'] }}</td>
        <td>{{ $sp['salinity_level'] }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif

{{-- ── COMPARATIVE ANALYSIS RANKINGS ── --}}
@if($report_type === 'Comparative Analysis' && isset($rankings))
<div class="section">
  <div class="section-title">City-Wide Suitability Rankings — Commercial Analysis (All 40 Barangays)</div>
  <table class="ranking-table">
    <thead>
      <tr><th>Rank</th><th>Barangay</th><th>Type</th><th>Score</th><th>Classification</th></tr>
    </thead>
    <tbody>
      @foreach($rankings as $r)
      <tr>
        <td><span class="rank-badge">{{ $r['rank'] }}</span></td>
        <td style="font-weight:600">{{ $r['unit_name'] }}</td>
        <td>{{ $r['unit_type'] }}</td>
        <td style="font-weight:700;color:{{ $r['total_pct'] >= 75 ? '#16a34a' : ($r['total_pct'] >= 50 ? '#d97706' : '#b91c1c') }}">{{ $r['total_pct'] }}%</td>
        <td>
          <span class="level-badge {{ $r['total_pct'] >= 75 ? 'level-high' : ($r['total_pct'] >= 50 ? 'level-mod' : 'level-low') }}">
            {{ $r['suitability_level'] }}
          </span>
        </td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif

{{-- ── RECOMMENDATIONS ── --}}
@if(in_array('Recommendations', $sections) && $report_type !== 'Reforestation Plan' && isset($total_pct))
<div class="section">
  <div class="section-title">Recommendations</div>
  <table class="info-table">
    <tr>
      <td>Overall Decision</td>
      <td>
        <strong style="color:{{ $total_pct >= 75 ? '#16a34a' : ($total_pct >= 50 ? '#d97706' : '#b91c1c') }}">
          @if($total_pct >= 75) Endorsed — Proceed with standard zoning requirements
          @elseif($total_pct >= 50) Conditional — Subject to hazard mitigation requirements
          @else Not Recommended — Significant environmental or infrastructure concerns
          @endif
        </strong>
      </td>
    </tr>
    <tr><td>Issued by</td><td>City Planning and Development Office (CPDO), Panabo City</td></tr>
    <tr><td>Legal Basis</td><td>Panabo City CLUP 2020–2029; RA 7160 Local Government Code</td></tr>
    <tr><td>Important Notice</td><td>This score is advisory only. Final clearance requires CPDO verification.</td></tr>
  </table>
</div>
@endif

{{-- ── FOOTER ── --}}
<div class="footer">
  <div>TerraSpec DSS · Panabo City CLUP 2020–2029 · Data: DENR-MGB XI, BSWM 2019, PSA 2020</div>
  <div>{{ $report_id }} · {{ $generated_at }}</div>
</div>

</body>
</html>
