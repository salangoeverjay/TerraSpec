<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Talks to the Gemini API: main model first, then the configured fallbacks. A model that is out of
 * quota, overloaded or withdrawn is skipped and remembered for a while, so later requests skip it at
 * once. Reads Gemini's finishReason so a cut-off answer is flagged and a blocked one is reported,
 * instead of being shown as complete or locking the model for everyone.
 */
class GeminiClient
{
    public const ALL_MODELS_BUSY_REPLY = 'The AI assistant has reached its usage limit for now. Please try again later. The map, suitability analysis and reports still work without it.';

    /** Finish reasons that mean Gemini refused this request; another model would refuse it too. */
    private const BLOCKED_REASONS = ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_SAFETY'];

    /**
     * @param  array<string, mixed>  $generationConfig
     * @return array{text: string, model: string, fallback_used: bool, truncated: bool}
     *
     * @throws GeminiResponseBlocked when Gemini refuses to answer this request
     * @throws RuntimeException when no model can answer
     */
    public function generate(string $system, string $user, array $generationConfig): array
    {
        $apiKey = config('services.gemini.api_key');

        if (! is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException('Gemini API key is not configured.');
        }

        foreach ($this->models() as $index => $model) {
            if (Cache::has($this->unavailableKey($model))) {
                continue;
            }

            try {
                $response = $this->request($apiKey, $model, $system, $user, $generationConfig);
            } catch (ConnectionException) {
                Cache::put($this->unavailableKey($model), true, 30);

                continue;
            }

            if ($response->successful()) {
                $text = collect(data_get($response->json(), 'candidates.0.content.parts', []))
                    ->reject(fn (array $part) => $part['thought'] ?? false)
                    ->pluck('text')
                    ->implode('');
                $finishReason = $response->json('candidates.0.finishReason');

                if (trim($text) !== '') {
                    return [
                        'text' => $text,
                        'model' => $model,
                        'fallback_used' => $index > 0,
                        'truncated' => $finishReason === 'MAX_TOKENS',
                    ];
                }

                // Refused because of what was asked: say so, and keep the model available for others
                if ($response->json('promptFeedback.blockReason') || in_array($finishReason, self::BLOCKED_REASONS, true)) {
                    throw new GeminiResponseBlocked($response->json('promptFeedback.blockReason') ?? $finishReason);
                }

                // Thinking used the whole output budget on this question: try the next model, no cooldown
                if ($finishReason === 'MAX_TOKENS') {
                    continue;
                }
            }

            if ($response->successful() || $this->isUnavailable($response)) {
                Cache::put($this->unavailableKey($model), true, $this->cooldownSeconds($response));

                continue;
            }

            // Anything else (e.g. an invalid API key) fails the same way on every model
            throw new RuntimeException($response->json('error.message') ?? 'Gemini request failed.');
        }

        throw new RuntimeException(self::ALL_MODELS_BUSY_REPLY);
    }

    /**
     * Ask Gemini for JSON that follows the given response schema (Gemini structured output).
     *
     * @param  array<string, mixed>  $schema  OpenAPI-style schema (type OBJECT, properties, enum, required)
     * @return array{data: array<string, mixed>, model: string, fallback_used: bool}
     */
    public function generateStructured(string $system, string $user, array $schema): array
    {
        $result = $this->generate($system, $user, [
            'temperature' => 0,
            'maxOutputTokens' => 2048,
            'responseMimeType' => 'application/json',
            'responseSchema' => $schema,
        ]);

        // A cut-off JSON answer cannot be trusted even if it happens to parse
        $data = $result['truncated'] ? null : json_decode($this->stripJsonFence($result['text']), true);

        if (! is_array($data)) {
            throw new RuntimeException('The AI did not return valid JSON.');
        }

        return ['data' => $data, 'model' => $result['model'], 'fallback_used' => $result['fallback_used']];
    }

    /**
     * @return array<int, string>
     */
    public function models(): array
    {
        $fallbacks = explode(',', (string) config('services.gemini.fallback_models', ''));

        return array_values(array_unique(array_filter(array_map('trim', [
            (string) config('services.gemini.model', 'gemini-2.5-flash'),
            ...$fallbacks,
        ]))));
    }

    private function stripJsonFence(string $text): string
    {
        return trim(preg_replace('/^```(?:json)?\s*|\s*```$/', '', trim($text)));
    }

    /**
     * @param  array<string, mixed>  $generationConfig
     */
    private function request(string $apiKey, string $model, string $system, string $user, array $generationConfig): Response
    {
        // Open-weight Gemma models take no separate system instruction: send it with the question
        $separateSystem = ! str_starts_with($model, 'gemma-');

        $payload = [
            'contents' => [[
                'role' => 'user',
                'parts' => [['text' => $separateSystem ? $user : "{$system}\n\n{$user}"]],
            ]],
            'generationConfig' => $generationConfig,
        ];

        if ($separateSystem) {
            $payload['systemInstruction'] = ['parts' => [['text' => $system]]];
        }

        return Http::baseUrl('https://generativelanguage.googleapis.com/v1beta')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(25)
            // Key in a header, not the URL, so it never appears in error messages or logs
            ->withHeaders(['x-goog-api-key' => $apiKey])
            ->post(sprintf('/models/%s:generateContent', $model), $payload);
    }

    /**
     * Out of quota, overloaded, or no longer offered: worth trying the next model.
     */
    private function isUnavailable(Response $response): bool
    {
        if ($response->status() === 429 || $response->serverError() || $response->status() === 404) {
            return true;
        }

        return (bool) preg_match('/no longer available|not found|not supported|deprecated/i', (string) $response->json('error.message'));
    }

    /**
     * How long to skip a model: until its quota resets (Google's retry delay), a minute when it is
     * overloaded or answered with nothing, a day when it is no longer offered.
     */
    private function cooldownSeconds(Response $response): int
    {
        if ($response->status() === 429) {
            $retryDelay = collect($response->json('error.details', []))->firstWhere('@type', 'type.googleapis.com/google.rpc.RetryInfo')['retryDelay'] ?? '60s';

            return min(max((int) $retryDelay, 30), 86400);
        }

        return $response->serverError() || $response->successful() ? 60 : 86400;
    }

    private function unavailableKey(string $model): string
    {
        return "gemini-unavailable:{$model}";
    }
}
