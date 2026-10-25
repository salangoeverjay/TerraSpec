<?php

use App\Models\SuitabilityAnalysis;
use App\Models\ZoneUnit;
use App\Services\ChatPromptBuilder;
use App\Services\ChatResponseGrounder;
use App\Services\GeminiChatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('returns a Gemini response for chatbot prompts', function () {
    config()->set('services.gemini.api_key', 'test-api-key');
    config()->set('services.gemini.model', 'gemini-2.5-flash');

    Http::fake([
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent*' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => '*Analyze* flood risk before approving residential use.'],
                        ],
                    ],
                ],
            ],
        ]),
    ]);

    $response = $this->postJson('/api/chatbot', [
        'prompt' => 'What should I check for residential development?',
        'context' => [
            'selection' => 'Parcel ID 12045-A',
            'suitability' => 82,
            'weights' => [
                'flood' => 0.1,
                'road' => 0.2,
            ],
        ],
    ]);

    $response
        ->assertOk()
        ->assertJson([
            'answer' => '*Analyze* flood risk before approving residential use.',
            'model' => 'gemini-2.5-flash',
        ]);

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'gemini-2.5-flash:generateContent')
            && filled(data_get($request->data(), 'contents.0.parts.0.text'));
    });
});

it('restricts the assistant to ordinance, CLUP and TerraSpec data', function () {
    config()->set('services.gemini.api_key', 'test-api-key');
    config()->set('services.gemini.model', 'gemini-2.5-flash');

    Http::fake([
        '*' => Http::response(['candidates' => [['content' => ['parts' => [['text' => 'ok']]]]]]),
    ]);

    $this->postJson('/api/chatbot', ['prompt' => 'Write me a poem about Manila'])->assertOk();

    Http::assertSent(function ($request) {
        $system = data_get($request->data(), 'systemInstruction.parts.0.text');

        return str_contains($system, ChatPromptBuilder::OFF_TOPIC_REPLY)
            && str_contains($system, 'Use ONLY the information between the SOURCES markers')
            && str_contains($system, 'Urbanizable land = total land area')
            && str_contains($system, 'Zoning Ordinance text is NOT loaded yet')
            && data_get($request->data(), 'generationConfig.temperature') <= 0.1;
    });
});

it('validates the chatbot prompt', function () {
    $this->postJson('/api/chatbot', [])->assertUnprocessable()->assertInvalid(['prompt']);
});

function geminiAnswer(string $text): array
{
    return ['candidates' => [['content' => ['parts' => [['text' => $text]]]]]];
}

function geminiQuotaError(): array
{
    return ['error' => [
        'code' => 429,
        'message' => 'You exceeded your current quota.',
        'details' => [['@type' => 'type.googleapis.com/google.rpc.RetryInfo', 'retryDelay' => '3600s']],
    ]];
}

beforeEach(function () {
    config()->set('services.gemini.api_key', 'test-api-key');
    config()->set('services.gemini.model', 'gemini-2.5-flash');
    config()->set('services.gemini.fallback_models', 'gemini-3.5-flash,gemma-4-31b-it');
});

it('switches to the next model when the main model is out of quota', function () {
    Http::fake([
        '*/models/gemini-2.5-flash:generateContent*' => Http::response(geminiQuotaError(), 429),
        '*/models/gemini-3.5-flash:generateContent*' => Http::response(geminiAnswer('Total land area is 25,123 ha.')),
    ]);

    $this->postJson('/api/chatbot', ['prompt' => 'What is the total land area of Panabo?'])
        ->assertOk()
        ->assertJson(['answer' => 'Total land area is 25,123 ha.', 'model' => 'gemini-3.5-flash', 'fallback_used' => true]);
});

it('skips a model that is still out of quota on the next question', function () {
    Http::fake([
        '*/models/gemini-2.5-flash:generateContent*' => Http::response(geminiQuotaError(), 429),
        '*/models/gemini-3.5-flash:generateContent*' => Http::response(geminiAnswer('ok')),
    ]);

    $this->postJson('/api/chatbot', ['prompt' => 'First question about Panabo zoning'])->assertOk();
    $this->postJson('/api/chatbot', ['prompt' => 'Second question about Panabo zoning'])->assertOk();

    Http::assertSentCount(3);
});

it('sends the system prompt inside the question for Gemma models', function () {
    Http::fake([
        '*/models/gemini-*' => Http::response(['error' => ['message' => 'This model is currently experiencing high demand.']], 503),
        '*/models/gemma-4-31b-it:generateContent*' => Http::response(geminiAnswer('ok from gemma')),
    ]);

    $this->postJson('/api/chatbot', ['prompt' => 'Which barangays are minor growth centers?'])
        ->assertOk()
        ->assertJson(['model' => 'gemma-4-31b-it', 'fallback_used' => true]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'gemma-4-31b-it')
        && ! isset($request['systemInstruction'])
        && str_contains($request['contents'][0]['parts'][0]['text'], 'You are TerraSpec AI'));
});

it('returns a friendly message when every model is out of quota', function () {
    Http::fake(['*' => Http::response(geminiQuotaError(), 429)]);

    $this->postJson('/api/chatbot', ['prompt' => 'What is the population of Panabo?'])
        ->assertStatus(503)
        ->assertJson(['message' => GeminiChatService::ALL_MODELS_BUSY_REPLY]);
});

it('does not try other models when the API key is invalid', function () {
    Http::fake(['*' => Http::response(['error' => ['code' => 400, 'message' => 'API key not valid.']], 400)]);

    $this->postJson('/api/chatbot', ['prompt' => 'What is the population of Panabo?'])->assertStatus(503);

    Http::assertSentCount(1);
});

it('sends the API key in a header, never in the URL', function () {
    Http::fake(['*' => Http::response(geminiAnswer('ok'))]);

    $this->postJson('/api/chatbot', ['prompt' => 'What is the total land area of Panabo?'])->assertOk();

    Http::assertSent(fn ($request) => $request->hasHeader('x-goog-api-key', 'test-api-key')
        && ! str_contains($request->url(), 'test-api-key'));
});

it('does not attach suitability chips to zoning or hazard answers', function () {
    $zone = ZoneUnit::create([
        'unit_name' => 'Dapco', 'unit_type' => 'Rural', 'total_area_ha' => 100,
        'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
        'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
        'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
    ]);
    SuitabilityAnalysis::create([
        'zone_unit_id' => $zone->zone_unit_id, 'analysis_type' => 'commercial',
        'total_score' => 0, 'suitability_level' => 'Not Suitable',
    ]);
    Http::fake(['*' => Http::response(geminiAnswer('In Dapco, 43.3 ha of Production Agricultural land is in very high flood areas.'))]);

    $this->postJson('/api/chatbot', ['prompt' => 'Agricultural land in very high flood areas in Dapco'])
        ->assertOk()
        ->assertJson(['detected_intent' => 'environmental_assessment', 'recommended_zones' => []]);
});

it('flags an answer that Gemini cut off at the output limit', function () {
    Http::fake(['*' => Http::response(['candidates' => [[
        'content' => ['parts' => [['text' => 'Panabo has 40 barangays and']]],
        'finishReason' => 'MAX_TOKENS',
    ]]])]);

    $response = $this->postJson('/api/chatbot', ['prompt' => 'Describe every barangay of Panabo'])->assertOk();

    expect($response->json('truncated'))->toBeTrue()
        ->and($response->json('answer'))->toEndWith(GeminiChatService::TRUNCATED_NOTE);
});

it('answers a blocked prompt plainly without trying other models or locking the model', function () {
    Http::fake(['*' => Http::response(['promptFeedback' => ['blockReason' => 'SAFETY']])]);

    $this->postJson('/api/chatbot', ['prompt' => 'Something the safety filter blocks'])
        ->assertOk()
        ->assertJson(['answer' => GeminiChatService::BLOCKED_REPLY, 'recommended_zones' => []]);

    Http::assertSentCount(1);
    expect(Cache::has('gemini-unavailable:gemini-2.5-flash'))->toBeFalse();
});

it('tries the next model without a cooldown when thinking used the whole output budget', function () {
    Http::fake([
        '*/models/gemini-2.5-flash:generateContent*' => Http::response(['candidates' => [[
            'content' => ['parts' => [['text' => 'long reasoning', 'thought' => true]]],
            'finishReason' => 'MAX_TOKENS',
        ]]]),
        '*/models/gemini-3.5-flash:generateContent*' => Http::response(geminiAnswer('Total land area is 25,123 ha.')),
    ]);

    $this->postJson('/api/chatbot', ['prompt' => 'What is the total land area of Panabo?'])
        ->assertOk()
        ->assertJson(['model' => 'gemini-3.5-flash', 'truncated' => false]);

    expect(Cache::has('gemini-unavailable:gemini-2.5-flash'))->toBeFalse();
});

it('matches barangay names as whole words, ignoring accents', function () {
    foreach (['Santo Nino', 'Dapco'] as $name) {
        ZoneUnit::create([
            'unit_name' => $name, 'unit_type' => 'Rural', 'total_area_ha' => 100,
            'population_2020' => 1000, 'household_count' => 250, 'population_density' => 10,
            'avg_household_size' => 4, 'settlement_tier' => 'Satellite', 'saturation_index' => 0.2,
            'dominant_soil_type' => 'Cabangan Clay Loam', 'dominant_slope_class' => '0-8', 'land_capability_class' => 'A',
        ]);
    }

    $entities = app(ChatResponseGrounder::class)->entities('Tell me about Santo Niño', 'It borders Dapcoville.');

    expect($entities)->toContain(['type' => 'barangay', 'value' => 'Santo Nino'])
        ->not->toContain(['type' => 'barangay', 'value' => 'Dapco']);
});

it('always ends a report narrative with the required disclaimer', function () {
    $grounder = app(ChatResponseGrounder::class);

    expect($grounder->narrative('Gredu scores **74.4%**.'))->toBe('Gredu scores 74.4%. '.ChatPromptBuilder::NARRATIVE_DISCLAIMER)
        ->and($grounder->narrative('Done. '.ChatPromptBuilder::NARRATIVE_DISCLAIMER))->toBe('Done. '.ChatPromptBuilder::NARRATIVE_DISCLAIMER)
        ->and($grounder->narrative(''))->toBe('');
});
