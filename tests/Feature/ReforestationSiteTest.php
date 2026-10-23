<?php

use App\Models\ReforestationSite;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;
use Database\Seeders\ReforestationSiteSeeder;
use Database\Seeders\SuitabilityCriteriaSeeder;
use Database\Seeders\TreeSpeciesSeeder;
use Database\Seeders\ZoneUnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([SuitabilityCriteriaSeeder::class, TreeSpeciesSeeder::class]);
});

/**
 * @param  array<string, float>  $zoning  code => area_ha
 */
function coastalZone(string $name, array $zoning, string $salinity = 'High'): ZoneUnit
{
    $zone = ZoneUnit::create([
        'unit_name' => $name, 'unit_type' => 'Urban', 'total_area_ha' => 100,
        'population_2020' => 5000, 'household_count' => 1000, 'population_density' => 50,
        'avg_household_size' => 5, 'settlement_tier' => 'CBD', 'saturation_index' => 0.9,
        'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
        'elevation_min' => 0, 'elevation_max' => 20, 'salinity_level' => $salinity,
    ]);
    ZoneHazardData::create(['zone_unit_id' => $zone->zone_unit_id]);

    foreach ($zoning as $code => $area) {
        ZoneZoningData::create(['zone_unit_id' => $zone->zone_unit_id, 'zoning_code' => $code, 'area_ha' => $area, 'flood_very_high_ha' => 0, 'landslide_high_ha' => 0]);
    }

    return $zone;
}

it('summarises the sites by status and barangay', function () {
    $zone = coastalZone('Coastal', ['MG' => 60, 'GR' => 40]);
    ReforestationSite::factory()->create(['zone_unit_id' => $zone->zone_unit_id, 'area_ha' => 1.5, 'year' => 2020]);
    ReforestationSite::factory()->adopted('DICT')->create(['zone_unit_id' => $zone->zone_unit_id, 'area_ha' => 1.0]);
    ReforestationSite::factory()->proposed()->create(['zone_unit_id' => $zone->zone_unit_id, 'area_ha' => 0.5]);

    $response = $this->getJson('/reforestation/sites')->assertOk();

    expect($response->json('data.summary.site_count'))->toBe(3)
        ->and($response->json('data.summary.total_ha'))->toEqual(3)
        ->and($response->json('data.summary.by_status.adopted'))->toEqual(['count' => 1, 'area_ha' => 1.0])
        ->and($response->json('data.summary.by_barangay.0.barangay'))->toBe('Coastal');
});

it('agrees with the actual sites when they are in the mangrove zone and mangrove species are recommended', function () {
    $zone = coastalZone('Coastal', ['MG' => 60, 'GR' => 40]);
    ReforestationSite::factory()->create([
        'zone_unit_id' => $zone->zone_unit_id, 'area_ha' => 2,
        'mangrove_zone_share' => 0.4, 'other_zone_share' => 0, 'unzoned_share' => 0.6,
    ]);

    $data = $this->getJson('/reforestation/sites')->assertOk()->json('data');

    expect($data['checks']['zoning']['agreement'])->toEqual(1)
        ->and($data['checks']['species']['agreement'])->toEqual(1)
        ->and($data['sites'][0]['top_species'][0]['mangrove'])->toBeTrue()
        ->and($data['checks']['terrestrial']['agreement'])->toBeNull();
});

it('flags sites inside other land-use zones and barangays without mangrove species', function () {
    $coast = coastalZone('Coastal', ['MG' => 60, 'GR' => 40]);
    $inland = coastalZone('Inland', ['PA' => 100], 'None');
    ReforestationSite::factory()->create(['zone_unit_id' => $coast->zone_unit_id, 'area_ha' => 1, 'mangrove_zone_share' => 1, 'other_zone_share' => 0, 'unzoned_share' => 0]);
    ReforestationSite::factory()->create(['zone_unit_id' => $inland->zone_unit_id, 'area_ha' => 3, 'mangrove_zone_share' => 0, 'other_zone_share' => 0.8, 'unzoned_share' => 0.2]);

    $checks = $this->getJson('/reforestation/sites')->assertOk()->json('data.checks');

    expect($checks['zoning']['agreement'])->toEqual(0.25)
        ->and($checks['species']['agreement'])->toEqual(0.25);
});

it('lists the sites of a barangay in its profile', function () {
    $zone = coastalZone('Coastal', ['MG' => 60, 'GR' => 40]);
    ReforestationSite::factory()->adopted('HCBI')->create(['zone_unit_id' => $zone->zone_unit_id, 'area_ha' => 0.94]);

    $this->getJson("/barangays/{$zone->zone_unit_id}/profile")
        ->assertOk()
        ->assertJsonPath('data.reforestation_sites.0.name', 'HCBI_Adopted Site')
        ->assertJsonPath('data.reforestation_sites.0.status', 'adopted');
});

it('seeds the 13 mangrove sites from the converted KML', function () {
    $this->seed([ZoneUnitSeeder::class, ReforestationSiteSeeder::class]);

    expect(ReforestationSite::count())->toBe(13)
        ->and(round(ReforestationSite::sum('area_ha'), 2))->toEqual(12.96)
        ->and(ReforestationSite::where('status', 'rehabilitated')->pluck('year')->sort()->values()->all())->toBe([2020, 2021, 2022, 2022, 2023])
        ->and(ReforestationSite::with('zoneUnit')->get()->pluck('zoneUnit.unit_name')->unique()->sort()->values()->all())->toBe(['J.P. Laurel', 'San Pedro']);
});

describe('reforestation study area', function () {
    beforeEach(function () {
        $this->coast = coastalZone('Coastal', ['MG' => 20, 'PA' => 80]);
        $this->inland = coastalZone('Inland', ['PA' => 100], 'None');
        ReforestationSite::factory()->create(['zone_unit_id' => $this->coast->zone_unit_id]);
    });

    it('lists only barangays with verified sites on the reforestation page', function () {
        $response = $this->getJson('/reforestation')->assertOk();

        expect(collect($response->json('zones'))->pluck('unit_name')->all())->toBe(['Coastal'])
            ->and($response->json('study_area.barangays'))->toBe(['Coastal']);
    });

    it('refuses species, plans and reports for barangays outside the study area', function () {
        $this->getJson("/reforestation/{$this->inland->zone_unit_id}/match")->assertStatus(422);
        $this->getJson("/reforestation/{$this->inland->zone_unit_id}/report")->assertStatus(422);
        $this->getJson('/reports/generate?type=Reforestation%20Plan&barangay=Inland')->assertStatus(422);
        $this->getJson("/reforestation/{$this->coast->zone_unit_id}/match")->assertOk();
    });

    it('limits the reforestation analysis to the study area but keeps every barangay for other land uses', function () {
        $reforestation = $this->getJson('/suitability/compare?analysis_type=reforestation')->assertOk();
        $agricultural = $this->getJson('/suitability/compare?analysis_type=agricultural')->assertOk();

        expect(collect($reforestation->json('data.units'))->pluck('unit_name')->all())->toBe(['Coastal'])
            ->and($reforestation->json('study_area.barangays'))->toBe(['Coastal'])
            ->and($agricultural->json('data.units'))->toHaveCount(2)
            ->and($agricultural->json('study_area'))->toBeNull();

        $this->getJson("/suitability/breakdown?analysis_type=reforestation&zone_unit_id={$this->inland->zone_unit_id}")->assertStatus(422);
        $this->getJson("/suitability/breakdown?analysis_type=agricultural&zone_unit_id={$this->inland->zone_unit_id}")->assertOk();
    });

    it('marks reforestation as not assessed in profiles outside the study area', function () {
        $this->getJson("/barangays/{$this->inland->zone_unit_id}/profile")
            ->assertOk()
            ->assertJsonPath('data.suitability.reforestation.outside_study_area', true)
            ->assertJsonPath('data.suitability.agricultural.level', fn ($level) => is_string($level));

        $this->getJson("/barangays/{$this->coast->zone_unit_id}/profile")
            ->assertOk()
            ->assertJsonMissingPath('data.suitability.reforestation.outside_study_area');
    });
});
