<?php

use App\Models\ReforestationSite;
use App\Models\Report;
use App\Models\User;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use Database\Seeders\MangroveSpeciesSeeder;
use Database\Seeders\SuitabilityCriteriaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // No AI key: the report narrative is skipped instead of calling Gemini
    config()->set('services.gemini.api_key', null);
    $this->seed([SuitabilityCriteriaSeeder::class, MangroveSpeciesSeeder::class]);

    $make = function (string $name): ZoneUnit {
        $zone = ZoneUnit::create([
            'unit_name' => $name, 'unit_type' => 'Rural', 'total_area_ha' => 100,
            'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
            'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
            'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
        ]);
        ZoneHazardData::create(['zone_unit_id' => $zone->zone_unit_id]);

        return $zone;
    };
    $this->coast = $make('Coastal');
    $this->inland = $make('Inland');
    ReforestationSite::factory()->create(['zone_unit_id' => $this->coast->zone_unit_id]);
});

it('does not let guests or viewers generate reports', function () {
    $this->getJson('/api/reports/generate?type=Suitability%20Summary&barangay=Inland')->assertUnauthorized();

    $this->actingAs(User::factory()->create(['role' => 'viewer']))
        ->getJson('/api/reports/generate?type=Suitability%20Summary&barangay=Inland')
        ->assertForbidden();

    expect(Report::count())->toBe(0);
});

it('lets planners generate a report for the chosen land use', function () {
    $planner = User::factory()->planner()->create();

    $this->actingAs($planner)
        ->get('/api/reports/generate?type=Suitability%20Summary&barangay=Inland&land_use=residential')
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    $report = Report::sole();
    expect($report->analysis_type)->toBe('residential')
        ->and($report->barangay)->toBe('Inland')
        ->and($report->generated_by)->toBe($planner->id);
});

it('validates the report type, barangay and land use', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->getJson('/api/reports/generate?type=Suitability%20Summary&barangay=Poblacion')->assertJsonValidationErrors('barangay');
    $this->getJson('/api/reports/generate?type=Suitability%20Summary')->assertJsonValidationErrors('barangay');
    $this->getJson('/api/reports/generate?type=Fake%20Report&barangay=Inland')->assertJsonValidationErrors('type');
    $this->getJson('/api/reports/generate?type=Suitability%20Summary&barangay=Inland&land_use=mining')->assertJsonValidationErrors('land_use');
});

it('keeps reforestation reports inside the study area', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->getJson('/api/reports/generate?type=Suitability%20Summary&barangay=Inland&land_use=reforestation')->assertStatus(422);
    $this->getJson('/api/reports/generate?type=Reforestation%20Plan&barangay=Inland')->assertStatus(422);
    $this->get('/api/reports/generate?type=Reforestation%20Plan&barangay=Coastal')->assertOk();
    $this->get('/api/reports/generate?type=Comparative%20Analysis&land_use=reforestation')->assertOk();
});

it('keeps the report archive for signed-in staff only', function () {
    $admin = User::factory()->admin()->create(['name' => 'Maria Planner']);
    Report::create(['report_type' => 'Suitability Summary', 'analysis_type' => 'commercial', 'barangay' => 'Inland', 'generated_by' => $admin->id, 'status' => 'Final']);

    $this->getJson('/api/reports')->assertUnauthorized();
    $this->actingAs($admin)->getJson('/api/reports')->assertOk()->assertJsonPath('0.generated_by', 'Maria Planner')->assertJsonPath('0.analysis_type', 'commercial');
});
