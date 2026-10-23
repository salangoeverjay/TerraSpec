<?php

use App\Models\ReforestationSite;
use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;
use App\Services\TerraSpecContextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set('services.gemini.api_key', 'test-api-key');
    config()->set('services.gemini.model', 'gemini-2.5-flash');
    config()->set('services.gemini.fallback_models', '');

    foreach (['Dapco', 'Manay', 'J.P. Laurel'] as $name) {
        ZoneUnit::create([
            'unit_name' => $name, 'unit_type' => 'Rural', 'total_area_ha' => 100,
            'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
            'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
            'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
        ]);
    }
});

/**
 * @param  array<string, mixed>  $filters
 */
function fakeMapFilters(array $filters): void
{
    Http::fake(['*' => Http::response(['candidates' => [['content' => ['parts' => [['text' => json_encode([
        'understood' => true, 'view' => 'zoning', 'zones' => [], 'barangays' => [], 'hazard' => 'any',
        'land_use' => 'none', 'min_area_ha' => null, 'explanation' => 'Test', ...$filters,
    ])]]]]]])]);
}

it('turns a question into validated zoning query filters', function () {
    fakeMapFilters(['view' => 'flood', 'zones' => ['PA'], 'barangays' => ['Dapco', 'manay'], 'hazard' => 'flood']);

    $data = $this->postJson('/api/map/interpret', ['question' => 'Agricultural land in very high flood areas in Dapco and Manay'])
        ->assertOk()->json('data');

    expect($data['action'])->toBe('query')
        ->and($data['filters']['zones'])->toBe(['PA'])
        ->and(collect($data['filters']['barangays'])->pluck('name')->all())->toBe(['Dapco', 'Manay'])
        ->and($data['filters']['hazard'])->toBe('flood')
        ->and($data['ignored'])->toBe([])
        ->and($data['model'])->toBe('gemini-2.5-flash');

    Http::assertSent(fn ($request) => data_get($request->data(), 'generationConfig.responseMimeType') === 'application/json'
        && data_get($request->data(), 'generationConfig.responseSchema.properties.zones.items.enum') !== null);
});

it('drops zoning codes and barangays that TerraSpec does not have', function () {
    fakeMapFilters(['zones' => ['PA', 'XX'], 'barangays' => ['Dapco', 'Poblacion']]);

    $data = $this->postJson('/api/map/interpret', ['question' => 'Farmland in Dapco and Poblacion'])->assertOk()->json('data');

    expect($data['filters']['zones'])->toBe(['PA'])
        ->and(collect($data['filters']['barangays'])->pluck('name')->all())->toBe(['Dapco'])
        ->and($data['ignored'])->toBe(['zoning class "XX"', 'barangay "Poblacion"']);
});

it('switches to the suitability view for the land use asked for', function () {
    fakeMapFilters(['view' => 'suitability', 'land_use' => 'residential']);

    expect($this->postJson('/api/map/interpret', ['question' => 'Where is residential suitability highest?'])->json('data'))
        ->action->toBe('view')->view->toBe('suitability')->land_use->toBe('residential');
});

it('defaults the suitability view to commercial when no land use is given', function () {
    fakeMapFilters(['view' => 'suitability', 'land_use' => 'none']);

    expect($this->postJson('/api/map/interpret', ['question' => 'Show suitability'])->json('data.land_use'))->toBe('commercial');
});

it('mentions the study area for reforestation questions', function () {
    ReforestationSite::factory()->create(['zone_unit_id' => ZoneUnit::where('unit_name', 'J.P. Laurel')->value('zone_unit_id')]);
    fakeMapFilters(['view' => 'reforestation']);

    $data = $this->postJson('/api/map/interpret', ['question' => 'Show the mangrove sites'])->assertOk()->json('data');

    expect($data['view'])->toBe('reforestation')->and($data['note'])->toContain('J.P. Laurel');
});

it('reports questions that are not about the map', function () {
    fakeMapFilters(['understood' => false]);

    expect($this->postJson('/api/map/interpret', ['question' => 'What is the capital of France?'])->json('data.understood'))->toBeFalse();
});

it('returns a friendly message when the AI is unavailable and validates the question', function () {
    Http::fake(['*' => Http::response(['error' => ['code' => 429, 'message' => 'quota']], 429)]);

    $this->postJson('/api/map/interpret', ['question' => 'Farmland in Dapco'])->assertStatus(503);
    $this->postJson('/api/map/interpret', ['question' => ''])->assertJsonValidationErrors('question');
});

it('gives the AI assistant the zoning hectares inside very high flood and high landslide areas', function () {
    ZoneZoningData::create([
        'zone_unit_id' => ZoneUnit::where('unit_name', 'Dapco')->value('zone_unit_id'),
        'zoning_code' => 'PA', 'area_ha' => 879.8, 'flood_very_high_ha' => 43.3, 'landslide_high_ha' => 0,
    ]);

    $context = app(TerraSpecContextService::class)->build();

    expect($context)->toContain('Dapco: Production Agricultural / SAFDZ 879.8 ha (100%; VH flood 43.3 ha)');
});
