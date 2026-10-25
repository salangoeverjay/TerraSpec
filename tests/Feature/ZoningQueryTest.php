<?php

use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @param  array<string, array{0: float, 1: float, 2: float}>  $zoning  code => [area_ha, flood_very_high_ha, landslide_high_ha]
 */
function zoningQueryZone(string $name, array $zoning): ZoneUnit
{
    $zone = ZoneUnit::create([
        'unit_name' => $name, 'unit_type' => 'Rural', 'total_area_ha' => 100,
        'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
        'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
        'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
    ]);

    foreach ($zoning as $code => [$area, $flood, $landslide]) {
        ZoneZoningData::create([
            'zone_unit_id' => $zone->zone_unit_id, 'zoning_code' => $code,
            'area_ha' => $area, 'flood_very_high_ha' => $flood, 'landslide_high_ha' => $landslide,
        ]);
    }

    return $zone;
}

beforeEach(function () {
    $this->dapco = zoningQueryZone('Dapco', ['PA' => [300, 40, 0], 'GR' => [50, 5, 0], 'NONE' => [20, 2, 0]]);
    $this->katualan = zoningQueryZone('Katualan', ['PA' => [100, 0, 30], 'FR' => [200, 0, 60]]);
});

it('totals the chosen zoning classes across barangays without unzoned land', function () {
    $response = $this->getJson('/zoning/query?zones[]=PA')->assertOk();

    expect($response->json('data.total_ha'))->toEqual(400)
        ->and($response->json('data.barangay_count'))->toBe(2)
        ->and($response->json('data.by_zone'))->toHaveCount(1)
        ->and($response->json('data.rows.0.barangay'))->toBe('Dapco');

    $all = $this->getJson('/zoning/query')->assertOk();
    expect($all->json('data.total_ha'))->toEqual(650);
});

it('limits the area to the hazard condition', function (string $hazard, float $expected) {
    $response = $this->getJson("/zoning/query?zones[]=PA&hazard={$hazard}")->assertOk();

    expect($response->json('data.total_ha'))->toEqual($expected);
})->with([
    'very high flood' => ['flood', 40],
    'high landslide' => ['landslide', 30],
    'hazard free' => ['hazard_free', 330],
]);

it('filters by barangay and drops rows below the minimum area', function () {
    $response = $this->getJson("/zoning/query?barangays[]={$this->dapco->zone_unit_id}&min_area_ha=100")->assertOk();

    expect($response->json('data.rows'))->toHaveCount(1)
        ->and($response->json('data.rows.0.zone'))->toBe('PA')
        ->and($response->json('data.by_barangay.0.barangay'))->toBe('Dapco');
});

it('rejects unknown zoning classes, barangays and hazards', function () {
    $this->getJson('/zoning/query?zones[]=XX')->assertJsonValidationErrors('zones.0');
    $this->getJson('/zoning/query?barangays[]=9999')->assertJsonValidationErrors('barangays.0');
    $this->getJson('/zoning/query?hazard=tsunami')->assertJsonValidationErrors('hazard');
});
