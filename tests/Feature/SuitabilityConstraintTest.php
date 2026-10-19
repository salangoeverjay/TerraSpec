<?php

use App\Models\ZoneHazardData;
use App\Models\ZoneSoilData;
use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;
use App\Services\SuitabilityScoreService;
use Database\Seeders\SuitabilityCriteriaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SuitabilityCriteriaSeeder::class);
});

/**
 * @param  array<string, array{0: float, 1?: float, 2?: float}>  $zoning  code => [area_ha, flood_very_high_ha, landslide_high_ha]
 */
function makeZone(string $name, array $zoning): ZoneUnit
{
    $zone = ZoneUnit::create([
        'unit_name' => $name, 'unit_type' => 'Rural', 'total_area_ha' => 100,
        'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
        'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
        'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
    ]);
    ZoneHazardData::create(['zone_unit_id' => $zone->zone_unit_id]);

    foreach ($zoning as $code => $values) {
        ZoneZoningData::create([
            'zone_unit_id' => $zone->zone_unit_id, 'zoning_code' => $code, 'area_ha' => $values[0],
            'flood_very_high_ha' => $values[1] ?? 0, 'landslide_high_ha' => $values[2] ?? 0,
        ]);
    }

    return $zone;
}

it('excludes a unit that is almost entirely SAFDZ from residential use', function () {
    $zone = makeZone('Farmland', ['PA' => [97], 'GR' => [3]]);

    $result = app(SuitabilityScoreService::class)->calculate($zone, 'residential');

    expect($result['suitability_level'])->toBe('Not Suitable')
        ->and($result['total_score'])->toBe(0.0)
        ->and($result['constraint']['excluded'])->toBeTrue()
        ->and($result['constraint']['available_area_ha'])->toEqualWithDelta(3.0, 0.01)
        ->and(array_key_first($result['constraint']['reasons']))->toBe('Production Agricultural / SAFDZ');
});

it('keeps the same unit for agriculture and scores zoning compliance from its zoning areas', function () {
    $zone = makeZone('Farmland', ['PA' => [97], 'GR' => [3]]);

    $result = app(SuitabilityScoreService::class)->calculate($zone, 'agricultural');

    // GR is a constraint for agriculture; the remaining land is all PA (compatibility 1.0)
    expect($result['constraint']['excluded'])->toBeFalse()
        ->and($result['scores']['zoning'])->toEqualWithDelta(1.0, 0.0001)
        ->and($result['total_score'])->toBeGreaterThan(0);
});

it('subtracts very high flood and high landslide land without double counting excluded zones', function () {
    $zone = makeZone('Townsite', ['GR' => [60, 10, 5], 'C' => [20], 'PA' => [20, 20]]);

    $result = app(SuitabilityScoreService::class)->calculate($zone, 'residential');

    // constrained = PA 20 (whole class) + GR flood 10 + GR landslide 5 = 35 of 100
    expect($result['constraint']['constrained_ha'])->toEqualWithDelta(35.0, 0.01)
        ->and($result['constraint']['available_share'])->toEqualWithDelta(0.65, 0.0001)
        // available: GR 45 (compat 1.0) + C 20 (compat 0.6) → (45 + 12) / 65
        ->and($result['scores']['zoning'])->toEqualWithDelta(57 / 65, 0.0001);
});

it('ignores unzoned remainder when computing shares', function () {
    $zone = makeZone('Edge', ['GR' => [50], 'NONE' => [50]]);

    $result = app(SuitabilityScoreService::class)->calculate($zone, 'residential');

    expect($result['constraint']['available_share'])->toEqualWithDelta(1.0, 0.0001)
        ->and($result['scores']['zoning'])->toEqualWithDelta(1.0, 0.0001);
});

it('compares four methods on eligible units and lists excluded units last', function () {
    makeZone('Townsite', ['GR' => [80], 'C' => [20]]);
    makeZone('Suburb', ['GR' => [50], 'PA' => [40], 'C' => [10]]);
    makeZone('Edge', ['GR' => [30], 'PA' => [70]]);
    makeZone('Farmland', ['PA' => [99], 'GR' => [1]]);

    $response = $this->getJson('/suitability/compare?analysis_type=residential')->assertOk();

    $units = $response->json('data.units');
    expect($response->json('methods'))->toHaveKeys(['ahp_wlc', 'ahp_topsis', 'ewm_wlc', 'ewm_topsis'])
        ->and($response->json('data.agreement.eligible_units'))->toBe(3)
        ->and(end($units)['unit_name'])->toBe('Farmland')
        ->and(end($units)['excluded'])->toBeTrue()
        ->and($units[0]['methods']['ahp_wlc']['rank'])->toBe(1)
        ->and(array_sum($response->json('data.weights.ewm')))->toEqualWithDelta(1.0, 0.001)
        ->and($response->json('data.agreement.spearman.ahp_wlc.ahp_wlc'))->toEqualWithDelta(1.0, 0.001);
});

it('reports AHP-WLC weight sensitivity for every weighted criterion and step', function () {
    makeZone('Townsite', ['GR' => [80], 'C' => [20]]);
    makeZone('Suburb', ['GR' => [50], 'PA' => [40], 'C' => [10]]);
    makeZone('Edge', ['GR' => [30], 'PA' => [70]]);
    makeZone('Farmland', ['PA' => [99], 'GR' => [1]]);

    $response = $this->getJson('/suitability/sensitivity?analysis_type=residential')->assertOk();

    $criteria = $response->json('data.criteria');
    expect($response->json('data.eligible_units'))->toBe(3)
        ->and($criteria)->toHaveCount(7)
        ->and($criteria[0]['results'])->toHaveCount(4)
        ->and(array_column($criteria[0]['results'], 'step'))->toEqual([-0.2, -0.1, 0.1, 0.2])
        ->and($response->json('data.robust_at_10'))->toBeBool();
});

it('breaks a barangay score into criterion score times weight', function () {
    $zone = makeZone('Townsite', ['GR' => [80], 'C' => [20]]);

    $response = $this->getJson("/suitability/breakdown?analysis_type=residential&zone_unit_id={$zone->zone_unit_id}")->assertOk();

    $criteria = $response->json('data.criteria');
    expect($criteria)->toHaveCount(7)
        ->and(array_sum(array_column($criteria, 'weight')))->toEqualWithDelta(1.0, 0.001);
    foreach ($criteria as $c) {
        expect($c['weighted'])->toEqualWithDelta($c['score'] * $c['weight'], 0.0001);
    }
    expect($response->json('data.weighted_sum'))->toEqualWithDelta($response->json('data.total_score'), 0.0001)
        ->and($response->json('data.constraint.excluded'))->toBeFalse();
});

it('shows an excluded barangay as Not Suitable in its breakdown', function () {
    $zone = makeZone('Farmland', ['PA' => [99], 'GR' => [1]]);

    $response = $this->getJson("/suitability/breakdown?analysis_type=residential&zone_unit_id={$zone->zone_unit_id}")->assertOk();

    expect($response->json('data.suitability_level'))->toBe('Not Suitable')
        ->and($response->json('data.total_pct'))->toEqual(0)
        ->and($response->json('data.constraint.excluded'))->toBeTrue();
});

it('returns a barangay profile with zoning, hazards and suitability per land use', function () {
    $zone = makeZone('Townsite', ['GR' => [60, 10, 0], 'C' => [30], 'PA' => [10], 'NONE' => [5]]);
    $zone->hazardData->update(['flood_high_ha' => 20, 'flood_low_ha' => 30, 'flood_none_ha' => 50, 'has_flood' => true]);

    $response = $this->getJson("/barangays/{$zone->zone_unit_id}/profile")->assertOk();

    $classes = $response->json('data.zoning.classes');
    expect($response->json('data.unit_name'))->toBe('Townsite')
        ->and($response->json('data.zoning.zoned_area_ha'))->toEqual(100)
        ->and($response->json('data.zoning.unzoned_area_ha'))->toEqual(5)
        ->and($classes[0]['code'])->toBe('GR')
        ->and(array_sum(array_column($classes, 'share')))->toEqualWithDelta(1.0, 0.001)
        ->and($response->json('data.zoning.mapped_flood_very_high_ha'))->toEqual(10)
        ->and($response->json('data.hazards.flood.total_ha'))->toEqual(100)
        ->and($response->json('data.hazards.flood.classes.0'))->toMatchArray(['label' => 'High', 'area_ha' => 20, 'share' => 0.2])
        ->and($response->json('data.hazards.flags.flood'))->toBeTrue()
        ->and(array_keys($response->json('data.suitability')))->toBe(['commercial', 'residential', 'industrial', 'agricultural', 'reforestation']);
});

it('lists all barangays for the profile page', function () {
    makeZone('Townsite', ['GR' => [100]]);
    makeZone('Farmland', ['PA' => [100]]);

    $this->getJson('/barangays')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.unit_name', 'Farmland');
});

it('returns 404 for an unknown barangay profile', function () {
    $this->getJson('/barangays/999/profile')->assertNotFound();
});

it('scores flood and liquefaction as shares of each CLUP table total, not the unit area', function () {
    // total_area_ha is 100, but the hazard tables report 200 ha for this barangay
    $zone = makeZone('Lowland', ['GR' => [100]]);
    $zone->hazardData->update([
        'flood_high_ha' => 40, 'flood_moderate_ha' => 20, 'flood_low_ha' => 50, 'flood_none_ha' => 90,
        'liquefaction_hsa_ha' => 20, 'liquefaction_msa_ha' => 40, 'liquefaction_lsa_ha' => 40, 'liquefaction_none_ha' => 100,
    ]);

    $scores = app(SuitabilityScoreService::class)->calculate($zone->fresh(), 'residential')['scores'];

    // flood: 1 - (40 + 20*0.5 + 50*0.2) / 200 = 0.70; liquefaction: 1 - (20 + 40*0.5 + 40*0.2) / 200 = 0.76
    expect($scores['flood'])->toEqualWithDelta(0.70, 0.0001)
        ->and($scores['liquefaction'])->toEqualWithDelta(0.76, 0.0001);
});

it('falls back to the unit area when a hazard table has no area for the barangay', function () {
    $zone = makeZone('Unrecorded', ['GR' => [100]]);

    $scores = app(SuitabilityScoreService::class)->calculate($zone, 'residential')['scores'];

    expect($scores['flood'])->toEqualWithDelta(1.0, 0.0001)
        ->and($scores['liquefaction'])->toEqualWithDelta(1.0, 0.0001);
});

it('scores soil as the area-weighted average of every soil type', function () {
    $zone = makeZone('Mixed Soil', ['GR' => [100]]);
    ZoneSoilData::create([
        'zone_unit_id' => $zone->zone_unit_id,
        'cabangan_clay_loam_ha' => 60, 'camasan_sandy_clay_loam_ha' => 0,
        'matina_clay_loam_ha' => 40, 'san_manuel_silty_clay_loam_ha' => 0,
    ]);

    $scores = app(SuitabilityScoreService::class)->calculate($zone->fresh(), 'residential')['scores'];

    // (60 × 0.85 + 40 × 0.55) / 100 = 0.73
    expect($scores['soil'])->toEqualWithDelta(0.73, 0.0001);
});

it('falls back to the dominant soil type when no soil areas are recorded', function () {
    $zone = makeZone('No Soil Data', ['GR' => [100]]);

    // makeZone uses Cabangan Clay Loam as the dominant soil type (score 0.85)
    expect(app(SuitabilityScoreService::class)->calculate($zone, 'residential')['scores']['soil'])->toEqualWithDelta(0.85, 0.0001);
});

it('falls back to the unit type rule when a unit has no zoning data', function () {
    $zone = makeZone('Unmapped', []);

    $result = app(SuitabilityScoreService::class)->calculate($zone, 'agricultural');

    expect($result['constraint'])->toBeNull()
        ->and($result['scores']['zoning'])->toEqualWithDelta(1.0, 0.0001);
});
