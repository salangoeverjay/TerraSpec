<?php

use App\Models\EnvironmentalRestriction;
use App\Models\SuitabilityAnalysis;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use Database\Seeders\EnvironmentalRestrictionSeeder;
use Database\Seeders\ReforestationSiteSeeder;
use Database\Seeders\ZoneHazardDataSeeder;
use Database\Seeders\ZoneUnitSeeder;
use Database\Seeders\ZoneZoningDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([ZoneUnitSeeder::class, ZoneHazardDataSeeder::class, ZoneZoningDataSeeder::class, ReforestationSiteSeeder::class, EnvironmentalRestrictionSeeder::class]);
});

function hazardOf(string $name): ZoneHazardData
{
    return ZoneUnit::where('unit_name', $name)->firstOrFail()->hazardData;
}

it('derives hazard flags from the CLUP flood table and the MGB landslide map', function () {
    expect(ZoneHazardData::count())->toBe(40)
        ->and(ZoneHazardData::where('has_flood', true)->count())->toBe(38)
        ->and(hazardOf('Consolacion')->has_flood)->toBeTrue()
        ->and(hazardOf('Katualan')->has_flood)->toBeFalse()
        ->and(hazardOf('New Malitbog')->has_landslide)->toBeTrue()
        ->and((float) hazardOf('New Malitbog')->landslide_moderate_ha)->toBeGreaterThan(300)
        ->and(hazardOf('Gredu')->has_landslide)->toBeFalse();
});

it('stores storm surge, drought and sea level rise as unknown instead of yes or no', function () {
    expect(ZoneHazardData::whereNull('has_storm_surge')->count())->toBe(40)
        ->and(ZoneHazardData::whereNull('has_drought')->count())->toBe(40)
        ->and(ZoneHazardData::whereNull('has_sea_level_rise')->count())->toBe(40);
});

it('builds restrictions only from the zoning map and the verified mangrove sites', function () {
    $byType = EnvironmentalRestriction::with('zoneUnits')->get()->keyBy('restriction_type');

    expect($byType->keys()->sort()->values()->all())->toBe(['Buffer', 'Forest', 'Mangrove', 'Mangrove site', 'SAFDZ'])
        ->and($byType['Mangrove']->zoneUnits->pluck('unit_name')->all())->toBe(['J.P. Laurel'])
        ->and($byType['Mangrove site']->zoneUnits->pluck('unit_name')->sort()->values()->all())->toBe(['J.P. Laurel', 'San Pedro'])
        ->and($byType['Forest']->zoneUnits->pluck('unit_name')->sort()->values()->all())->toBe(['Lower Panaga', 'New Malaga', 'New Malitbog', 'Tibungol', 'Waterfall']);
});

it('reports the environmental summary from verified sources, matching the CLUP counts', function () {
    $data = $this->getJson('/environmental/summary')->assertOk()->json();

    expect($data['flood_risk_count'])->toBe(17)
        ->and($data['liquefaction_count'])->toBe(23)
        ->and($data['protected_count'])->toBe(7)
        ->and($data['watersheds'])->toHaveCount(4)
        ->and(collect($data['watersheds'])->firstWhere('name', 'Tuganay River Watershed')['barangays'])->toContain('Tibungol')
        ->and($data['hazards'][0])->not->toHaveKey('has_storm_surge')
        ->and($data['flood_zones'][0])->not->toHaveKey('risk_level');

    $this->get('/environmental/report')->assertOk()->assertHeader('content-type', 'application/pdf');
});

it('counts high-hazard barangays on the dashboard from verified data', function () {
    $stats = $this->getJson('/api/dashboard-stats')->assertOk()->json();

    expect($stats['breakdown'])->toBe(['flood' => 17, 'landslide' => 17, 'liquefaction' => 23])
        ->and($stats['flagged_count'])->toBe(27)
        ->and($stats['restrictions'][0]['severity'])->toBe('high');
});

it('ranks each barangay once from live scores, ignoring stored calculation rows', function () {
    $zone = ZoneUnit::first();
    SuitabilityAnalysis::create(['zone_unit_id' => $zone->zone_unit_id, 'analysis_type' => 'commercial', 'total_score' => 0.99, 'suitability_level' => 'Highly Suitable']);
    SuitabilityAnalysis::create(['zone_unit_id' => $zone->zone_unit_id, 'analysis_type' => 'commercial', 'total_score' => 0.98, 'suitability_level' => 'Highly Suitable']);

    $rankings = collect($this->getJson('/suitability/rankings?analysis_type=commercial')->assertOk()->json('data'));

    expect($rankings)->toHaveCount(40)
        ->and($rankings->pluck('zone_unit_id')->unique())->toHaveCount(40)
        ->and($rankings->firstWhere('zone_unit_id', $zone->zone_unit_id)['total_pct'])->not->toEqual(99);
});
