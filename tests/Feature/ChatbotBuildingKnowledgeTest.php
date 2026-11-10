<?php

use App\Models\SuitabilityCriteria;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;
use App\Services\ChatPromptBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * A barangay with residential, commercial and farm zoning, part of the residential land in very high flood.
 */
function buildingZone(string $name = 'Gredu'): ZoneUnit
{
    $zone = ZoneUnit::create([
        'unit_name' => $name, 'unit_type' => 'Urban', 'total_area_ha' => 200,
        'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
        'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
        'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
    ]);
    ZoneHazardData::create(['zone_unit_id' => $zone->zone_unit_id]);

    foreach ([
        ['zoning_code' => 'GR', 'area_ha' => 50, 'flood_very_high_ha' => 10, 'landslide_high_ha' => 0],
        ['zoning_code' => 'GC', 'area_ha' => 20, 'flood_very_high_ha' => 0, 'landslide_high_ha' => 0],
        ['zoning_code' => 'PA', 'area_ha' => 100, 'flood_very_high_ha' => 0, 'landslide_high_ha' => 0],
    ] as $row) {
        ZoneZoningData::create(['zone_unit_id' => $zone->zone_unit_id, ...$row]);
    }

    return $zone;
}

it('tells the assistant the current AHP weights for each land use', function () {
    SuitabilityCriteria::create([
        'criteria_name' => 'Flood Risk', 'default_weight' => 0.3, 'commercial_weight' => 0.25,
        'residential_weight' => 0.35, 'industrial_weight' => 0.3, 'agricultural_weight' => 0.2, 'reforestation_weight' => 0.15,
    ]);
    SuitabilityCriteria::create([
        'criteria_name' => 'Zoning Compliance', 'default_weight' => 0.05, 'commercial_weight' => 0,
        'residential_weight' => 0.05, 'industrial_weight' => 0.1, 'agricultural_weight' => 0.15, 'reforestation_weight' => 0.2,
    ]);

    $prompt = app(ChatPromptBuilder::class)->systemPrompt('What are the AHP weights?');

    expect($prompt)
        ->toContain('CURRENT AHP CRITERIA WEIGHTS')
        ->toContain('Residential: Flood Risk 35%, Zoning Compliance 5%')
        ->toContain('Commercial: Flood Risk 25%, Zoning Compliance 0%');
});

it('tells the assistant which zones TerraSpec treats as allowing each kind of building', function () {
    $prompt = app(ChatPromptBuilder::class)->systemPrompt('Can I build a house here?');

    expect($prompt)
        ->toContain('houses, subdivisions and apartments: residential')
        ->toContain('schools, hospitals and government buildings: General Institutional')
        ->toContain('Residential: principal in General Residential, Residential-1')
        ->toContain('excluded for residential: Production Agricultural / SAFDZ, Forest Reserve, Mangrove, Quarry, Buffer / Greenbelt, very high flood land, high landslide land')
        ->toContain('provisional');
});

it('gives the assistant the hazard-free land in each use\'s principal zones per barangay', function () {
    buildingZone('Gredu');

    $prompt = app(ChatPromptBuilder::class)->systemPrompt('Where should I build a house?');

    expect($prompt)
        ->toContain('LAND IN EACH USE\'S PRINCIPAL ZONES')
        ->toContain('Gredu: 50.0 ha zoned, 40.0 ha outside very high flood and high landslide')
        ->toContain('Gredu: 20.0 ha zoned, 20.0 ha outside very high flood and high landslide');
});

it('loads the TerraSpec user guide and the building permit notes as sources', function () {
    $prompt = app(ChatPromptBuilder::class)->systemPrompt('How do I use the zoning query?');

    expect($prompt)
        ->toContain('=== REFERENCE: terraspec-user-guide.md ===')
        ->toContain('Zoning query')
        ->toContain('=== REFERENCE: building-permits-national.md ===')
        ->toContain('Locational Clearance');
});

it('tells the assistant how to answer building and location questions', function () {
    $prompt = app(ChatPromptBuilder::class)->systemPrompt('Where can I build a mall?');

    expect($prompt)
        ->toContain('BUILDING AND LOCATION QUESTIONS')
        ->toContain('still give TerraSpec\'s provisional allowed-use values');
});
