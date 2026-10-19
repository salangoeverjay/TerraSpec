<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Sends the TerraSpec AI prompt (same system prompt and grounding as the live chatbot) to a
 * Gemini API model and scores the answer against the benchmark's expected facts.
 */
class ChatbotBenchmarkService
{
    public function __construct(private GeminiChatService $chat) {}

    /**
     * @return array<int, array{id: string, category: string, question: string, expected: string, require: array<int, string>, forbid?: array<int, string>}>
     */
    public function questions(): array
    {
        $path = resource_path('benchmarks/chatbot-questions.json');

        return json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR)['questions'];
    }

    /**
     * Ask one model one question with the live chatbot's prompt and generation settings.
     *
     * @return array{answer: string, latency_ms: int, input_tokens: int, output_tokens: int, thinking_tokens: int, finish_reason: ?string, system_in_user_turn: bool}
     */
    public function ask(string $model, string $question): array
    {
        return match (true) {
            str_starts_with($model, 'gpt-') => $this->askOpenAi($model, $question),
            str_starts_with($model, 'claude-') => $this->askAnthropic($model, $question),
            default => $this->askGemini($model, $question),
        };
    }

    /**
     * OpenAI (ChatGPT) Chat Completions API. Sampling settings are left at the default because
     * current GPT models reject a custom temperature.
     *
     * @return array{answer: string, latency_ms: int, input_tokens: int, output_tokens: int, thinking_tokens: int, finish_reason: ?string, system_in_user_turn: bool}
     */
    public function askOpenAi(string $model, string $question): array
    {
        $apiKey = $this->key('openai');
        $started = microtime(true);

        $response = Http::baseUrl('https://api.openai.com/v1')
            ->withToken($apiKey)
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(120)
            ->post('/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $this->chat->systemPrompt($question)],
                    ['role' => 'user', 'content' => $this->chat->buildPrompt($question, [])],
                ],
                'max_completion_tokens' => 2048,
            ]);

        $latency = (int) round((microtime(true) - $started) * 1000);
        $this->throwUnlessSuccessful($response);

        $reasoning = (int) $response->json('usage.completion_tokens_details.reasoning_tokens', 0);

        return [
            'answer' => trim((string) $response->json('choices.0.message.content', '')),
            'latency_ms' => $latency,
            'input_tokens' => (int) $response->json('usage.prompt_tokens', 0),
            'output_tokens' => (int) $response->json('usage.completion_tokens', 0) - $reasoning,
            'thinking_tokens' => $reasoning,
            'finish_reason' => $response->json('choices.0.finish_reason'),
            'system_in_user_turn' => false,
        ];
    }

    /**
     * Anthropic (Claude) Messages API. Sampling settings are left at the default because current
     * Claude models reject a custom temperature.
     *
     * @return array{answer: string, latency_ms: int, input_tokens: int, output_tokens: int, thinking_tokens: int, finish_reason: ?string, system_in_user_turn: bool}
     */
    public function askAnthropic(string $model, string $question): array
    {
        $apiKey = $this->key('anthropic');
        $started = microtime(true);

        $response = Http::baseUrl('https://api.anthropic.com/v1')
            ->withHeaders(['x-api-key' => $apiKey, 'anthropic-version' => '2023-06-01'])
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(120)
            ->post('/messages', [
                'model' => $model,
                'max_tokens' => 2048,
                'system' => $this->chat->systemPrompt($question),
                'messages' => [['role' => 'user', 'content' => $this->chat->buildPrompt($question, [])]],
            ]);

        $latency = (int) round((microtime(true) - $started) * 1000);
        $this->throwUnlessSuccessful($response);

        return [
            'answer' => trim(collect($response->json('content', []))->where('type', 'text')->pluck('text')->implode('')),
            'latency_ms' => $latency,
            'input_tokens' => (int) $response->json('usage.input_tokens', 0),
            'output_tokens' => (int) $response->json('usage.output_tokens', 0),
            'thinking_tokens' => 0,
            'finish_reason' => $response->json('stop_reason'),
            'system_in_user_turn' => false,
        ];
    }

    /**
     * @return array{answer: string, latency_ms: int, input_tokens: int, output_tokens: int, thinking_tokens: int, finish_reason: ?string, system_in_user_turn: bool}
     */
    public function askGemini(string $model, string $question): array
    {
        $apiKey = config('services.gemini.api_key');

        if (! is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException('Gemini API key is not configured.');
        }

        $system = $this->chat->systemPrompt($question);
        $user = $this->chat->buildPrompt($question, []);

        $started = microtime(true);
        $response = $this->send($apiKey, $model, $system, $user, separateSystem: true);
        $systemInUserTurn = false;

        // Open-weight Gemma models on the Gemini API do not accept a separate system instruction
        if ($response->status() === 400 && str_contains(strtolower((string) $response->json('error.message')), 'instruction')) {
            $started = microtime(true);
            $response = $this->send($apiKey, $model, $system, $user, separateSystem: false);
            $systemInUserTurn = true;
        }

        $latency = (int) round((microtime(true) - $started) * 1000);

        if (! $response->successful()) {
            throw new RuntimeException($response->json('error.message') ?? "HTTP {$response->status()}");
        }

        $parts = collect(data_get($response->json(), 'candidates.0.content.parts', []))
            ->reject(fn (array $part) => $part['thought'] ?? false)
            ->pluck('text')
            ->implode('');

        return [
            'answer' => trim($parts),
            'latency_ms' => $latency,
            'input_tokens' => (int) $response->json('usageMetadata.promptTokenCount', 0),
            'output_tokens' => (int) $response->json('usageMetadata.candidatesTokenCount', 0),
            'thinking_tokens' => (int) $response->json('usageMetadata.thoughtsTokenCount', 0),
            'finish_reason' => $response->json('candidates.0.finishReason'),
            'system_in_user_turn' => $systemInUserTurn,
        ];
    }

    /**
     * Pass when every required pattern matches and no forbidden pattern does.
     *
     * @param  array{require: array<int, string>, forbid?: array<int, string>}  $question
     * @return array{pass: bool, required_found: int, required_total: int, missing: array<int, string>, forbidden_found: array<int, string>}
     */
    public function score(array $question, string $answer): array
    {
        $matches = fn (string $pattern) => (bool) preg_match('/'.str_replace('/', '\/', $pattern).'/iu', $answer);

        $missing = array_values(array_filter($question['require'], fn (string $p) => ! $matches($p)));
        $forbidden = array_values(array_filter($question['forbid'] ?? [], $matches));

        return [
            'pass' => $answer !== '' && $missing === [] && $forbidden === [],
            'required_found' => count($question['require']) - count($missing),
            'required_total' => count($question['require']),
            'missing' => $missing,
            'forbidden_found' => $forbidden,
        ];
    }

    private function key(string $provider): string
    {
        $apiKey = config("services.{$provider}.api_key");

        if (! is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException(strtoupper($provider).'_API_KEY is not configured.');
        }

        return $apiKey;
    }

    private function throwUnlessSuccessful(Response $response): void
    {
        if (! $response->successful()) {
            throw new RuntimeException($response->json('error.message') ?? "HTTP {$response->status()}");
        }
    }

    private function send(string $apiKey, string $model, string $system, string $user, bool $separateSystem): Response
    {
        $payload = [
            'contents' => [[
                'role' => 'user',
                'parts' => [['text' => $separateSystem ? $user : "{$system}\n\n{$user}"]],
            ]],
            // Live chatbot settings; more output room so thinking models are not cut off
            'generationConfig' => ['temperature' => 0.1, 'topP' => 0.9, 'maxOutputTokens' => 2048],
        ];

        if ($separateSystem) {
            $payload['systemInstruction'] = ['parts' => [['text' => $system]]];
        }

        return Http::baseUrl('https://generativelanguage.googleapis.com/v1beta')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(120)
            // Key in a header, not the URL, so it never appears in error messages or logs
            ->withHeaders(['x-goog-api-key' => $apiKey])
            ->post(sprintf('/models/%s:generateContent', $model), $payload);
    }
}
