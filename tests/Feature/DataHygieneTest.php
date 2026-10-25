<?php

use App\Models\PopulationProjection;
use App\Models\SuitabilityAnalysis;
use App\Models\User;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use Database\Seeders\MatchesZoneUnits;
use Database\Seeders\PopulationProjectionSeeder;
use Database\Seeders\ReforestationSiteSeeder;
use Database\Seeders\SuitabilityAnalysisSeeder;
use Database\Seeders\SuitabilityCriteriaSeeder;
use Database\Seeders\ZoneHazardDataSeeder;
use Database\Seeders\ZoneSoilDataSeeder;
use Database\Seeders\ZoneUnitSeeder;
use Database\Seeders\ZoneZoningDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('keeps 40 barangays and one hazard and population row each when seeding twice', function () {
    $seeders = [ZoneUnitSeeder::class, ZoneHazardDataSeeder::class, ZoneSoilDataSeeder::class, PopulationProjectionSeeder::class];

    $this->seed($seeders);
    $this->seed($seeders);

    expect(ZoneUnit::count())->toBe(40)
        ->and(ZoneHazardData::count())->toBe(40)
        ->and(ZoneHazardData::distinct('zone_unit_id')->count('zone_unit_id'))->toBe(40)
        ->and(PopulationProjection::count())->toBe(120);
});

it('matches source names ignoring accents and punctuation, and stops on an unknown barangay', function () {
    $this->seed(ZoneUnitSeeder::class);
    $matcher = new class
    {
        use MatchesZoneUnits;

        public function find(string $name): int
        {
            return $this->zoneIdFor($name, 'test source');
        }
    };

    expect($matcher->find('Santo Niño'))->toBe(ZoneUnit::where('unit_name', 'Santo Nino')->value('zone_unit_id'))
        ->and($matcher->find('A. O. Floirendo'))->toBe(ZoneUnit::where('unit_name', 'A.O. Floirendo')->value('zone_unit_id'))
        ->and(fn () => $matcher->find('Atlantis'))->toThrow(RuntimeException::class, "test source: no zone unit named 'Atlantis'.");
});

it('runs the suitability analysis seeder from code without a console', function () {
    $this->seed([ZoneUnitSeeder::class, ZoneHazardDataSeeder::class, ZoneZoningDataSeeder::class, ReforestationSiteSeeder::class, SuitabilityCriteriaSeeder::class]);

    (new SuitabilityAnalysisSeeder)->run();

    expect(SuitabilityAnalysis::where('analysis_type', 'commercial')->count())->toBe(40);
});

it('reports a barangay without hazard data as not assessed instead of failing', function () {
    $this->seed([ZoneUnitSeeder::class, ZoneHazardDataSeeder::class, ZoneZoningDataSeeder::class, ReforestationSiteSeeder::class, SuitabilityCriteriaSeeder::class]);
    $gredu = ZoneUnit::where('unit_name', 'Gredu')->firstOrFail();
    $gredu->hazardData()->delete();

    $breakdown = $this->getJson("/suitability/breakdown?analysis_type=commercial&zone_unit_id={$gredu->zone_unit_id}")->assertOk()->json('data');
    $rankings = collect($this->getJson('/suitability/rankings?analysis_type=commercial')->assertOk()->json('data'));

    expect($breakdown['suitability_level'])->toBe('Not Assessed')
        ->and($rankings)->toHaveCount(39)
        ->and($rankings->pluck('unit_name'))->not->toContain('Gredu');
    $this->getJson("/barangays/{$gredu->zone_unit_id}/profile")->assertOk();
});

it('does not let staff rename a barangay', function () {
    $this->seed(ZoneUnitSeeder::class);
    $zone = ZoneUnit::where('unit_name', 'Gredu')->firstOrFail();
    $fields = [
        'unit_type' => 'Urban', 'total_area_ha' => 300, 'settlement_tier' => 'CBD',
        'elevation_min' => 0, 'elevation_max' => 20, 'salinity_level' => 'None',
    ];
    $this->actingAs(User::factory()->admin()->create());

    $this->putJson("/api/admin/zones/{$zone->zone_unit_id}", ['unit_name' => 'New Gredu', ...$fields])
        ->assertUnprocessable()
        ->assertInvalid(['unit_name' => 'cannot be changed']);

    $this->putJson("/api/admin/zones/{$zone->zone_unit_id}", ['unit_name' => 'Gredu', ...$fields])->assertOk();

    expect($zone->fresh()->unit_name)->toBe('Gredu')
        ->and((float) $zone->fresh()->total_area_ha)->toEqual(300.0);
});
