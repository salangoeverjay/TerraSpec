<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 32px 36px; }

  .header { border-bottom: 2.5px solid #16a34a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header-left h1 { font-size: 18px; font-weight: 700; color: #16a34a; letter-spacing: -0.03em; }
  .header-left p  { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .header-right   { text-align: right; font-size: 10px; color: #6b7280; line-height: 1.6; }

  .section        { margin-bottom: 20px; }
  .section-title  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #16a34a; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }

  .meta-grid      { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .meta-box       { flex: 1; min-width: 130px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 9px 12px; }
  .meta-box-label { font-size: 9.5px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .meta-box-value { font-size: 13px; font-weight: 700; color: #15803d; }

  .info-table     { width: 100%; border-collapse: collapse; font-size: 11px; }
  .info-table td  { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
  .info-table td:first-child { color: #6b7280; width: 38%; }
  .info-table td:last-child  { font-weight: 600; }

  .species-table  { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .species-table th { background: #f0fdf4; color: #166534; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 7px 8px; text-align: left; border-bottom: 1.5px solid #bbf7d0; }
  .species-table td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .species-table tr:last-child td { border-bottom: none; }
  .rank-badge     { display: inline-block; background: #16a34a; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 99px; }
  .score-high     { color: #16a34a; font-weight: 700; }
  .score-mid      { color: #d97706; font-weight: 700; }
  .score-low      { color: #6b7280; font-weight: 600; }

  .restriction-box { background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px; }
  .restriction-type { display: inline-block; background: #fee2e2; color: #b91c1c; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-bottom: 4px; }
  .restriction-name { font-size: 11px; font-weight: 600; margin-bottom: 3px; }
  .restriction-desc { font-size: 10px; color: #6b7280; line-height: 1.5; }

  .no-restriction { color: #16a34a; font-size: 11px; padding: 8px 0; }

  .footer { border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 24px; display: flex; justify-content: space-between; font-size: 9.5px; color: #9ca3af; }

  .bar-wrap  { background: #e5e7eb; border-radius: 99px; height: 5px; width: 80px; display: inline-block; vertical-align: middle; }
  .bar-fill  { background: #16a34a; border-radius: 99px; height: 5px; }
</style>
</head>
<body>

{{-- Header --}}
<div class="header">
  <div class="header-left">
    <h1>TerraSpec — Reforestation Plan</h1>
    <p>Panabo City, Davao del Norte · City Planning and Development Office</p>
  </div>
  <div class="header-right">
    <div>Report ID: RPT-{{ strtoupper(substr(md5($zone['unit_name'] . $generatedAt), 0, 8)) }}</div>
    <div>Generated: {{ $generatedAt }}</div>
    <div>Prepared by: CPDO Panabo City</div>
  </div>
</div>

{{-- Summary Boxes --}}
<div class="meta-grid">
  <div class="meta-box">
    <div class="meta-box-label">Barangay</div>
    <div class="meta-box-value">{{ $zone['unit_name'] }}</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Classification</div>
    <div class="meta-box-value">{{ $zone['unit_type'] }}</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Total Area</div>
    <div class="meta-box-value">{{ number_format($zone['total_area_ha'], 1) }} ha</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Species Matched</div>
    <div class="meta-box-value">{{ $summary['total_species_matched'] }}</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Avg Match Score</div>
    <div class="meta-box-value">{{ $summary['avg_score_pct'] }}%</div>
  </div>
  <div class="meta-box">
    <div class="meta-box-label">Restrictions</div>
    <div class="meta-box-value" style="{{ $summary['restriction_count'] > 0 ? 'color:#b91c1c' : '' }}">{{ $summary['restriction_count'] }}</div>
  </div>
</div>

{{-- Zone Parameters --}}
<div class="section">
  <div class="section-title">Zone Parameters</div>
  <table class="info-table">
    <tr><td>Dominant Soil Type</td><td>{{ $zone['dominant_soil_type'] ?? '—' }}</td></tr>
    <tr><td>Elevation Range</td><td>{{ $zone['elevation_min'] }}–{{ $zone['elevation_max'] }} m asl</td></tr>
    <tr><td>Salinity Level</td><td>{{ $zone['salinity_level'] }}</td></tr>
    <tr><td>Dominant Slope Class</td><td>{{ $zone['dominant_slope_class'] ?? '—' }}</td></tr>
    <tr><td>Land Capability Class</td><td>{{ $zone['land_capability_class'] ?? '—' }}</td></tr>
    <tr><td>Settlement Tier</td><td>{{ $zone['settlement_tier'] ?? '—' }}</td></tr>
  </table>
</div>

{{-- Recommended Species --}}
<div class="section">
  <div class="section-title">Recommended Tree Species (AHP-WLC Matched)</div>
  @if(count($allSpecies) > 0)
  <table class="species-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Common Name</th>
        <th>Scientific Name</th>
        <th>Match Score</th>
        <th>Soil</th>
        <th>Elevation</th>
        <th>Salinity</th>
      </tr>
    </thead>
    <tbody>
      @foreach($allSpecies as $sp)
      <tr>
        <td><span class="rank-badge">{{ $sp['rank'] }}</span></td>
        <td style="font-weight:600">{{ $sp['common_name'] }}</td>
        <td style="font-style:italic;color:#6b7280">{{ $sp['scientific_name'] }}</td>
        <td>
          <span class="{{ $sp['score_pct'] >= 80 ? 'score-high' : ($sp['score_pct'] >= 55 ? 'score-mid' : 'score-low') }}">
            {{ $sp['score_pct'] }}%
          </span>
          <br>
          <div class="bar-wrap"><div class="bar-fill" style="width:{{ $sp['score_pct'] }}%"></div></div>
        </td>
        <td>{{ $sp['soil_preference'] }}</td>
        <td>{{ $sp['elevation_range'] }} m</td>
        <td>{{ $sp['salinity_level'] }}</td>
      </tr>
      @if(!empty($sp['suitability_notes']))
      <tr>
        <td></td>
        <td colspan="6" style="color:#6b7280;font-size:10px;padding-top:2px;padding-bottom:8px">
          {{ $sp['suitability_notes'] }}
        </td>
      </tr>
      @endif
      @endforeach
    </tbody>
  </table>
  @else
  <p style="color:#6b7280">No species matched for this zone's conditions.</p>
  @endif
</div>

{{-- Environmental Restrictions --}}
<div class="section">
  <div class="section-title">Environmental Restrictions</div>
  @if(count($restrictions) > 0)
    @foreach($restrictions as $r)
    <div class="restriction-box">
      <div><span class="restriction-type">{{ $r['restriction_type'] }}</span></div>
      <div class="restriction-name">{{ $r['restriction_name'] }}</div>
      <div class="restriction-desc">{{ $r['description'] }}</div>
    </div>
    @endforeach
  @else
    <div class="no-restriction">✓ No environmental restrictions apply to this zone.</div>
  @endif
</div>

{{-- Footer --}}
<div class="footer">
  <div>TerraSpec DSS · Panabo City CLUP 2020–2029 · Data Source: DENR-MGB XI, BSWM 2019</div>
  <div>This document is for planning purposes only. Verify with CPDO before implementation.</div>
</div>

</body>
</html>
