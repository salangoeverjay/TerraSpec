<?php

namespace App\Services;

use App\Models\SuitabilityAnalysis;
use App\Models\ZoneUnit;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiChatService
{
    public function __construct(private TerraSpecContextService $context) {}

    public function reply(string $prompt, array $context = []): array
    {
        $apiKey = config('services.gemini.api_key');
        $model  = config('services.gemini.model', 'gemini-2.5-flash');

        if (! is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException('Gemini API key is not configured.');
        }

        $response = Http::baseUrl('https://generativelanguage.googleapis.com/v1beta')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(30)
            ->retry([250, 500, 1000], throw: false)
            ->withQueryParameters(['key' => $apiKey])
            ->post(sprintf('/models/%s:generateContent', $model), [
                'systemInstruction' => [
                    'parts' => [['text' => $this->systemPrompt()]],
                ],
                'contents' => [
                    [
                        'role'  => 'user',
                        'parts' => [['text' => $this->buildPrompt($prompt, $context)]],
                    ],
                ],
                'generationConfig' => [
                    'temperature'     => 0.2,
                    'topP'            => 0.9,
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

        $normalized = $this->normalizeAnswer($answer);

        return [
            'answer'             => $normalized,
            'model'              => $model,
            'recommended_zones'  => $this->extractMentionedZones($normalized, $prompt),
        ];
    }

    private function extractMentionedZones(string $answer, string $prompt): array
    {
        $allZones = ZoneUnit::pluck('unit_name', 'zone_unit_id')->all();
        $type     = $this->detectAnalysisType($prompt);

        $mentionedIds = [];
        foreach ($allZones as $id => $name) {
            if (stripos($answer, $name) !== false) {
                $mentionedIds[] = $id;
            }
        }

        if (empty($mentionedIds)) {
            return [];
        }

        return SuitabilityAnalysis::with('zoneUnit')
            ->whereIn('zone_unit_id', $mentionedIds)
            ->where('analysis_type', $type)
            ->orderByDesc('total_score')
            ->get()
            ->take(5)
            ->map(fn ($a) => [
                'zone_unit_id'      => $a->zone_unit_id,
                'unit_name'         => $a->zoneUnit->unit_name,
                'unit_type'         => $a->zoneUnit->unit_type,
                'total_pct'         => round($a->total_score * 100, 1),
                'suitability_level' => $a->suitability_level,
                'analysis_type'     => $type,
            ])
            ->values()
            ->all();
    }

    private function detectAnalysisType(string $prompt): string
    {
        if (preg_match('/residen|house|home|living|dwell|neighborhood|subdivision/i', $prompt)) {
            return 'residential';
        }
        if (preg_match('/industr|factory|manufactur|warehouse|logistics/i', $prompt)) {
            return 'industrial';
        }
        if (preg_match('/reforest|mangrove|forest|tree.plant|plant.*tree|what.*tree|which.*tree|species.*plant|bakawan|pagatpat|nipa|molave|ipil|toog|dao/i', $prompt)) {
            return 'reforestation';
        }
        return 'commercial';
    }

    private function systemPrompt(): string
    {
        $dataContext = $this->context->build();

        return <<<PROMPT
You are TerraSpec AI, a land-use suitability assistant for Panabo City, Davao del Norte, Philippines.
You answer questions about where to build, invest, or develop land based on AHP-WLC suitability scores.
Give concise, practical answers. Do not use markdown formatting or asterisks.
Always cite specific barangay names and scores when recommending locations.
If a barangay has environmental restrictions or hazard flags, mention them as caveats.
If the user asks for legal advice, state clearly that this is decision support only and must be verified by the City Planning and Development Office.

--- PANABO CITY DATA ---
{$dataContext}
--- END OF DATA ---
PROMPT;
    }

    private function buildPrompt(string $prompt, array $context): string
    {
        $extra = '';
        if (! empty($context['selection'])) {
            $extra .= "\nCurrent map selection: {$context['selection']}";
        }
        if (! empty($context['suitability'])) {
            $extra .= "\nDisplayed suitability score: {$context['suitability']}%";
        }

        return trim("User question: {$prompt}{$extra}");
    }

    private function normalizeAnswer(string $answer): string
    {
        return trim(str_replace('*', '', $answer));
    }
}
