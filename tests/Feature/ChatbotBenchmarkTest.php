<?php

use App\Services\ChatbotBenchmarkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set('services.gemini.api_key', 'test-api-key');
});

it('passes an answer only when every required fact is present and nothing forbidden is', function () {
    $benchmark = app(ChatbotBenchmarkService::class);
    $question = ['require' => ['209,?230', '265,?924'], 'forbid' => ['Paris']];

    expect($benchmark->score($question, 'Population 209,230 in 2020, 265924 by 2029.')['pass'])->toBeTrue()
        ->and($benchmark->score($question, 'Population 209,230 in 2020.')['missing'])->toBe(['265,?924'])
        ->and($benchmark->score($question, '209,230 and 265,924, like Paris.')['forbidden_found'])->toBe(['Paris'])
        ->and($benchmark->score($question, '')['pass'])->toBeFalse();
});

it('has expected patterns that compile for every benchmark question', function () {
    $benchmark = app(ChatbotBenchmarkService::class);

    foreach ($benchmark->questions() as $question) {
        expect($question)->toHaveKeys(['id', 'category', 'question', 'expected', 'require']);
        foreach ([...$question['require'], ...($question['forbid'] ?? [])] as $pattern) {
            expect(@preg_match('/'.str_replace('/', '\/', $pattern).'/iu', ''))->not->toBeFalse();
        }
    }
});

it('reads the answer, tokens and thinking separately from the model response', function () {
    Http::fake([
        '*/models/gemini-2.5-flash:generateContent*' => Http::response([
            'candidates' => [[
                'content' => ['parts' => [['text' => 'planning…', 'thought' => true], ['text' => 'Total land area is 25,123 ha.']]],
                'finishReason' => 'STOP',
            ]],
            'usageMetadata' => ['promptTokenCount' => 9000, 'candidatesTokenCount' => 12, 'thoughtsTokenCount' => 80],
        ]),
    ]);

    $reply = app(ChatbotBenchmarkService::class)->ask('gemini-2.5-flash', 'What is the total land area?');

    expect($reply['answer'])->toBe('Total land area is 25,123 ha.')
        ->and($reply['input_tokens'])->toBe(9000)
        ->and($reply['thinking_tokens'])->toBe(80)
        ->and($reply['system_in_user_turn'])->toBeFalse();
});

it('moves the system prompt into the user turn for models without system instructions', function () {
    Http::fakeSequence('*/models/gemma-4-31b-it:generateContent*')
        ->push(['error' => ['message' => 'Developer instruction is not enabled for models/gemma-4-31b-it']], 400)
        ->push(['candidates' => [['content' => ['parts' => [['text' => '25,123 ha']]]]]]);

    $reply = app(ChatbotBenchmarkService::class)->ask('gemma-4-31b-it', 'What is the total land area?');

    expect($reply['answer'])->toBe('25,123 ha')->and($reply['system_in_user_turn'])->toBeTrue();
    Http::assertSent(fn ($request) => ! isset($request['systemInstruction']) && str_contains($request['contents'][0]['parts'][0]['text'], 'You are TerraSpec AI'));
});

it('asks ChatGPT models through the OpenAI API with the same grounded prompt', function () {
    config()->set('services.openai.api_key', 'test-openai-key');
    Http::fake([
        'https://api.openai.com/v1/chat/completions' => Http::response([
            'choices' => [['message' => ['content' => 'Total land area is 25,123 ha.'], 'finish_reason' => 'stop']],
            'usage' => ['prompt_tokens' => 9000, 'completion_tokens' => 50, 'completion_tokens_details' => ['reasoning_tokens' => 30]],
        ]),
    ]);

    $reply = app(ChatbotBenchmarkService::class)->ask('gpt-6.1-sol', 'What is the total land area?');

    expect($reply['answer'])->toBe('Total land area is 25,123 ha.')
        ->and($reply['output_tokens'])->toBe(20)
        ->and($reply['thinking_tokens'])->toBe(30);
    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer test-openai-key')
        && $request['messages'][0]['role'] === 'system'
        && str_contains($request['messages'][0]['content'], 'You are TerraSpec AI'));
});

it('asks Claude models through the Anthropic API with the same grounded prompt', function () {
    config()->set('services.anthropic.api_key', 'test-anthropic-key');
    Http::fake([
        'https://api.anthropic.com/v1/messages' => Http::response([
            'content' => [['type' => 'thinking', 'thinking' => ''], ['type' => 'text', 'text' => '25,123 hectares']],
            'stop_reason' => 'end_turn',
            'usage' => ['input_tokens' => 9100, 'output_tokens' => 40],
        ]),
    ]);

    $reply = app(ChatbotBenchmarkService::class)->ask('claude-sonnet-5-5', 'What is the total land area?');

    expect($reply['answer'])->toBe('25,123 hectares')->and($reply['input_tokens'])->toBe(9100);
    Http::assertSent(fn ($request) => $request->hasHeader('x-api-key', 'test-anthropic-key')
        && str_contains($request['system'], 'You are TerraSpec AI'));
});

it('reports a missing provider key instead of calling the API', function () {
    config()->set('services.anthropic.api_key', null);
    Http::fake();

    expect(fn () => app(ChatbotBenchmarkService::class)->ask('claude-haiku-5-5', 'Hi'))
        ->toThrow(RuntimeException::class, 'ANTHROPIC_API_KEY is not configured.');
    Http::assertNothingSent();
});
