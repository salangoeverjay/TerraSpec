<?php

use App\Models\SuitabilityAnalysis;
use App\Models\User;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\StrayRequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

function hardeningZone(): ZoneUnit
{
    $zone = ZoneUnit::create([
        'unit_name' => 'Gredu', 'unit_type' => 'Urban', 'total_area_ha' => 100,
        'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
        'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
        'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
    ]);
    ZoneHazardData::create(['zone_unit_id' => $zone->zone_unit_id]);

    return $zone;
}

function fakeGeminiAnswer(): void
{
    config()->set('services.gemini.api_key', 'test-api-key');
    config()->set('services.gemini.model', 'gemini-2.5-flash');

    Http::fake([
        'https://generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => 'Answer from the CLUP.']]]]],
        ]),
    ]);
}

it('lets only signed-in staff save suitability runs', function () {
    $zone = hardeningZone();
    $body = ['analysis_type' => 'commercial', 'zone_unit_id' => $zone->zone_unit_id];

    $this->postJson('/suitability/calculate', $body)->assertUnauthorized();
    $this->postJson('/suitability/nlp', ['query' => 'best place for a grocery store'])->assertUnauthorized();
    expect(SuitabilityAnalysis::count())->toBe(0);

    $this->actingAs(User::factory()->planner()->create())->postJson('/suitability/calculate', $body)->assertOk();
    expect(SuitabilityAnalysis::count())->toBe(1);
});

it('returns 404 for non-numeric ids instead of a server error', function () {
    $this->getJson('/suitability/abc')->assertNotFound();
    $this->getJson('/reforestation/abc/match')->assertNotFound();
    $this->getJson('/reforestation/abc/report')->assertNotFound();
    $this->getJson('/reforestation/abc/pdf')->assertNotFound();
});

it('rejects an unknown land use in the rankings', function () {
    $this->getJson('/suitability/rankings?analysis_type=casino')->assertUnprocessable()->assertInvalid(['analysis_type']);
    $this->getJson('/suitability/rankings')->assertOk()->assertJsonPath('analysis_type', 'commercial');
});

it('passes the zoning class on screen to the chat prompt', function () {
    fakeGeminiAnswer();

    $this->postJson('/api/chatbot', [
        'prompt' => 'Can I build here?',
        'context' => ['selection' => 'Gredu', 'zone' => 'Mangrove Sub-Zone'],
    ])->assertOk();

    Http::assertSent(fn ($request) => str_contains($request->body(), 'Gredu (Zone: Mangrove Sub-Zone)'));
});

it('rejects an overlong zoning class in the chat context', function () {
    $this->postJson('/api/chatbot', [
        'prompt' => 'Can I build here?',
        'context' => ['zone' => str_repeat('x', 101)],
    ])->assertUnprocessable()->assertInvalid(['context.zone']);
});

it('limits each visitor to 20 chat questions per minute', function () {
    fakeGeminiAnswer();

    foreach (range(1, 20) as $i) {
        $this->postJson('/api/chatbot', ['prompt' => "Question {$i} about Panabo zoning"])->assertOk();
    }

    $this->postJson('/api/chatbot', ['prompt' => 'One more question'])
        ->assertTooManyRequests()
        ->assertJsonPath('message', 'You are sending questions too quickly. Please wait a minute and try again.');
});

it('blocks real HTTP calls and paid AI keys in tests', function () {
    expect(config('services.gemini.api_key'))->toBeEmpty()
        ->and(config('services.openai.api_key'))->toBeEmpty()
        ->and(config('services.anthropic.api_key'))->toBeEmpty()
        ->and(fn () => Http::get('https://generativelanguage.googleapis.com/v1beta/models'))->toThrow(StrayRequestException::class);
});

it('hides exception details on API errors when debug is off', function () {
    config(['app.debug' => false]);
    Route::get('/api/test-failure', fn () => throw new RuntimeException('secret detail'));

    $response = $this->getJson('/api/test-failure')->assertStatus(500);

    expect($response->json('message'))->toBe('Server Error')
        ->and($response->json())->not->toHaveKeys(['exception', 'file', 'trace'])
        ->and($response->getContent())->not->toContain('secret detail');
});
