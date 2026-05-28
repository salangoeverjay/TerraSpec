<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiChatService
{
    public function reply(string $prompt, array $context = []): array
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model', 'gemini-2.5-flash');

        if (! is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException('Gemini API key is not configured.');
        }

        $response = Http::baseUrl('https://generativelanguage.googleapis.com/v1beta')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(30)
            ->retry([250, 500, 1000], throw: false)
            ->withQueryParameters([
                'key' => $apiKey,
            ])
            ->post(sprintf('/models/%s:generateContent', $model), [
                'systemInstruction' => [
                    'parts' => [
                        [
                            'text' => $this->systemPrompt(),
                        ],
                    ],
                ],
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            [
                                'text' => $this->buildPrompt($prompt, $context),
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.2,
                    'topP' => 0.9,
                    'maxOutputTokens' => 700,
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException($response->json('error.message') ?? 'Gemini request failed.');
        }

        $answer = data_get($response->json(), 'candidates.0.content.parts.0.text');

        if (! is_string($answer) || $answer === '') {
            throw new RuntimeException('Gemini returned an empty response.');
        }

        return [
            'answer' => $this->normalizeAnswer($answer),
            'model' => $model,
        ];
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are TERRASPEC, an AI assistant for Panabo City land suitability and zoning review.
Give concise, practical answers.
Do not use markdown formatting or asterisks.
Use the provided context when discussing parcel suitability, map filters, protected zones, and reforestation recommendations.
If the user asks for legal advice, clearly state that the output is decision support only and must be verified by the City Planning and Development Office.
PROMPT;
    }

    private function buildPrompt(string $prompt, array $context): string
    {
        $contextText = json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return trim(<<<PROMPT
User request:
{$prompt}

Context:
{$contextText}

Respond with an actionable answer for a geospatial land suitability assistant.
PROMPT);
    }

    private function normalizeAnswer(string $answer): string
    {
        return trim(str_replace('*', '', $answer));
    }
}
