<?php

use App\Models\MangroveSpecies;
use App\Models\ReforestationSite;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use App\Services\TerraSpecContextService;
use Database\Seeders\MangroveSpeciesSeeder;
use Database\Seeders\TreeSpeciesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([TreeSpeciesSeeder::class, MangroveSpeciesSeeder::class]);

    $this->zone = ZoneUnit::create([
        'unit_name' => 'Coastal', 'unit_type' => 'Urban', 'total_area_ha' => 100,
        'population_2020' => 5000, 'household_count' => 1000, 'population_density' => 50,
        'avg_household_size' => 5, 'settlement_tier' => 'CBD', 'saturation_index' => 0.9,
        'dominant_soil_type' => 'San Manuel Silty Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
    ]);
    ZoneHazardData::create(['zone_unit_id' => $this->zone->zone_unit_id]);
    ReforestationSite::factory()->create(['zone_unit_id' => $this->zone->zone_unit_id]);
});

it('seeds the 13 true mangroves and 5 associates of the Davao del Norte survey as printed', function () {
    expect(MangroveSpecies::where('category', 'true_mangrove')->count())->toBe(13)
        ->and(MangroveSpecies::where('category', 'associate')->count())->toBe(5)
        ->and(MangroveSpecies::where('scientific_name', 'Avicennia rumphiana')->value('iucn_status'))->toBe('Vulnerable')
        ->and(MangroveSpecies::where('scientific_name', 'Ceriops decandra')->value('iucn_status'))->toBe('Near threatened')
        ->and(MangroveSpecies::where('scientific_name', 'Hibiscus tiliaceus')->value('iucn_status'))->toBe('Not assessed')
        ->and(MangroveSpecies::where('scientific_name', 'Aegiceras corniculatum')->value('habit'))->toBe('Shrub');
});

it('recommends only mangroves and associates, grouped by tidal zone, without scores', function () {
    $mangrove = $this->getJson("/reforestation/{$this->zone->zone_unit_id}/match")->assertOk()->json('mangrove');
    $names = collect($mangrove['species'])->pluck('scientific_name');

    expect($names)->toHaveCount(18)
        ->and($names)->not->toContain('Vitex parviflora')
        ->and($names)->not->toContain('Dracontomelon dao')
        ->and(collect($mangrove['zones'])->pluck('key')->all())->toBe(['seaward', 'middle', 'landward', 'riverine', 'back_mangrove'])
        ->and(collect($mangrove['species'])->every(fn ($s) => ! array_key_exists('score_pct', $s)))->toBeTrue()
        ->and(collect($mangrove['conservation_priority'])->pluck('local_name')->all())->toBe(['Api-api', 'Malatangal'])
        ->and($mangrove['site_data_needed'])->not->toBeEmpty();
});

it('keeps Bakauan out of the seaward zone', function () {
    $seaward = collect($this->getJson("/reforestation/{$this->zone->zone_unit_id}/match")->json('mangrove.zones'))->firstWhere('key', 'seaward');

    expect(collect($seaward['species'])->pluck('scientific_name')->all())->toBe(['Avicennia marina', 'Avicennia rumphiana', 'Sonneratia alba']);
});

it('generates the mangrove reforestation plan PDF', function () {
    $this->get("/reforestation/{$this->zone->zone_unit_id}/pdf")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
});

it('gives the AI assistant mangrove species only', function () {
    $context = app(TerraSpecContextService::class)->build();

    expect($context)->toContain('MANGROVE SPECIES FOR REFORESTATION')
        ->and($context)->toContain('Rhizophora mucronata')
        ->and($context)->not->toContain('Vitex parviflora');
});

it('lists true mangroves on the dashboard, conservation priorities first', function () {
    $species = $this->getJson('/api/dashboard-stats')->assertOk()->json('species');

    expect($species)->toHaveCount(5)
        ->and($species[0]['common_name'])->toBe('Api-api')
        ->and($species[1]['common_name'])->toBe('Malatangal');
});
