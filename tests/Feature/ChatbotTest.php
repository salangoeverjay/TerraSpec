<?php

use App\Services\GeminiChatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

        return str_contains($system, GeminiChatService::OFF_TOPIC_REPLY)
            && str_contains($system, 'Use ONLY the information between the SOURCES markers')
            && str_contains($system, 'Urbanizable land = total land area')
            && str_contains($system, 'Zoning Ordinance text is NOT loaded yet')
            && data_get($request->data(), 'generationConfig.temperature') <= 0.1;
    });
});

it('validates the chatbot prompt', function () {
    $this->postJson('/api/chatbot', [])->assertUnprocessable()->assertInvalid(['prompt']);
});
