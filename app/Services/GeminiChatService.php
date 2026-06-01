<?php

namespace App\Services;

use App\Models\SuitabilityAnalysis;
use App\Models\ZoneUnit;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiChatService
{
    public function __construct(
        private TerraSpecContextService $context,
        private SuitabilityScoreService $scorer,
    ) {}

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
            'detected_intent'    => $this->detectIntent($prompt),
            'extracted_entities' => $this->extractEntities($prompt, $normalized),
            'live_calculation'   => $this->runLiveCalculation($prompt),
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

    private function runLiveCalculation(string $prompt): ?array
    {
        // Only trigger on explicit calculation/analysis keywords
        $hasTrigger = (bool) preg_match(
            '/\b(calculat|comput|run.{0,10}anal|analyz|evaluat|how.{0,10}suitable|suitability.{0,20}(score|of|for)|score.{0,10}of|assess)\b/i',
            $prompt
        );

        if (!$hasTrigger) return null;

        // Find a matching barangay name in the prompt
        $zones = ZoneUnit::with(['hazardData', 'soilData'])->get();
        $matched = null;
        foreach ($zones as $zone) {
            if (stripos($prompt, $zone->unit_name) !== false) {
                $matched = $zone;
                break;
            }
        }

        if (!$matched) return null;

        $type   = $this->detectAnalysisType($prompt);
        $result = $this->scorer->calculate($matched, $type);

        return [
            'zone_unit_id'      => $matched->zone_unit_id,
            'zone_name'         => $matched->unit_name,
            'zone_type'         => $matched->unit_type,
            'analysis_type'     => $type,
            'total_pct'         => $result['total_pct'],
            'suitability_level' => $result['suitability_level'],
            'criteria_breakdown'=> $result['criteria_breakdown'],
        ];
    }

    public function generateNarrative(array $ctx): string
    {
        $apiKey = config('services.gemini.api_key');
        $model  = config('services.gemini.model', 'gemini-2.5-flash');

        if (!is_string($apiKey) || $apiKey === '') {
            return '';
        }

        try {
            $response = Http::baseUrl('https://generativelanguage.googleapis.com/v1beta')
                ->acceptJson()->asJson()
                ->connectTimeout(10)->timeout(20)
                ->withQueryParameters(['key' => $apiKey])
                ->post(sprintf('/models/%s:generateContent', $model), [
                    'systemInstruction' => [
                        'parts' => [['text' => 'You are a professional urban planner writing official land use report narratives for Panabo City, Davao del Norte, Philippines. Write in formal, clear English. No markdown. No asterisks. Plain prose only. Be concise and specific.']],
                    ],
                    'contents' => [
                        ['role' => 'user', 'parts' => [['text' => $this->buildNarrativePrompt($ctx)]]],
                    ],
                    'generationConfig' => ['temperature' => 0.25, 'maxOutputTokens' => 280],
                ]);

            if (!$response->successful()) return '';

            $text = data_get($response->json(), 'candidates.0.content.parts.0.text', '');
            return trim(str_replace('*', '', $text));
        } catch (\Throwable) {
            return '';
        }
    }

    private function buildNarrativePrompt(array $ctx): string
    {
        $type   = $ctx['report_type'] ?? 'Suitability Summary';
        $zone   = $ctx['zone']   ?? null;
        $hazard = $ctx['hazard'] ?? null;

        $lines = ["Report Type: {$type}"];

        if ($zone) {
            $tier = str_replace('_', ' ', $zone->settlement_tier ?? '');
            $lines[] = "Zone: {$zone->unit_name}, {$zone->unit_type}, "
                     . number_format((float)$zone->total_area_ha, 1)
                     . " ha, {$tier} tier, population {$zone->population_2020}";
        }

        if (isset($ctx['total_pct'])) {
            $lines[] = "Overall Score: {$ctx['total_pct']}% — {$ctx['suitability_level']}";
        }

        if (!empty($ctx['criteria_breakdown'])) {
            $top = collect($ctx['criteria_breakdown'])
                ->sortByDesc(fn($v) => $v['weighted'])
                ->take(3);
            $lines[] = 'Top Contributing Criteria:';
            foreach ($top as $name => $v) {
                $lines[] = "  - {$name}: " . round($v['score'] * 100) . '% score, '
                         . round($v['weight'] * 100) . '% weight';
            }
        }

        if ($hazard) {
            $flags = array_filter([
                $hazard->has_flood          ? 'Flood'          : null,
                $hazard->has_landslide      ? 'Landslide'      : null,
                $hazard->has_storm_surge    ? 'Storm Surge'    : null,
                $hazard->has_drought        ? 'Drought'        : null,
                $hazard->has_sea_level_rise ? 'Sea Level Rise' : null,
            ]);
            $lines[] = 'Active Hazard Flags: ' . (empty($flags) ? 'None' : implode(', ', $flags));
        }

        $restrictionCount = isset($ctx['restrictions']) ? count($ctx['restrictions']) : 0;
        $lines[] = "Environmental Restrictions: {$restrictionCount}";

        if (!empty($ctx['top_species'])) {
            $sp = collect($ctx['top_species'])->take(3)
                ->map(fn($s) => "{$s['common_name']} ({$s['score_pct']}%)")->implode(', ');
            $lines[] = "Top Matched Species: {$sp}";
        }

        if (!empty($ctx['rankings'])) {
            $top3 = collect($ctx['rankings'])->take(3)
                ->map(fn($r) => "{$r['unit_name']} ({$r['total_pct']}%)")->implode(', ');
            $lines[] = "City-wide Top Zones: {$top3}";
        }

        $block = implode("\n", $lines);

        return <<<PROMPT
Write a professional 3-4 sentence executive summary for this official land suitability report.
Cite the exact score, zone name, and classification. Highlight the top 2 scoring criteria.
Note any hazard warnings as a caveat. End with: "This assessment is for decision-support only
and must be verified by the City Planning and Development Office before regulatory use."

{$block}
PROMPT;
    }

    private function detectIntent(string $prompt): string
    {
        if (preg_match('/flood|hazard|landslide|storm.surge|sea.level|drought|restrict|protected|watershed|mangrove.park|cenro/i', $prompt)) {
            return 'environmental_assessment';
        }
        if (preg_match('/zone|zoning|ordinance|setback|allowed.use|permit|compliance|classification/i', $prompt)) {
            return 'zoning_compliance';
        }

        return match ($this->detectAnalysisType($prompt)) {
            'residential'   => 'residential_suitability',
            'industrial'    => 'industrial_suitability',
            'agricultural'  => 'agricultural_suitability',
            'reforestation' => 'reforestation',
            default         => 'commercial_suitability',
        };
    }

    private function extractEntities(string $prompt, string $answer): array
    {
        $text     = $prompt . ' ' . $answer;
        $entities = [];
        $seen     = [];

        // 1. Barangay names from zone_units table
        $barangays = ZoneUnit::pluck('unit_name')->all();
        foreach ($barangays as $name) {
            if (stripos($text, $name) !== false && !isset($seen[$name])) {
                $entities[] = ['type' => 'barangay', 'value' => $name];
                $seen[$name] = true;
            }
        }

        // 2. Zone classifications (R-1, C-1, I-1, A-1, M-1, IN-1, P-1, MX-1)
        preg_match_all('/\b(R-1|C-1|I-1|A-1|M-1|IN-1|P-1|MX-1)\b/i', $text, $zoneMatches);
        foreach (array_unique($zoneMatches[1]) as $zone) {
            $key = 'zone_' . $zone;
            if (!isset($seen[$key])) {
                $entities[] = ['type' => 'zone', 'value' => strtoupper($zone)];
                $seen[$key] = true;
            }
        }

        // 3. Parcel codes (PCL-XXXXX)
        preg_match_all('/\bPCL-\d{4,6}\b/i', $text, $parcelMatches);
        foreach (array_unique($parcelMatches[0]) as $parcel) {
            if (!isset($seen[$parcel])) {
                $entities[] = ['type' => 'parcel', 'value' => strtoupper($parcel)];
                $seen[$parcel] = true;
            }
        }

        // 4. Tree species
        $species = ['Bakawan', 'Pagatpat', 'Nipa Palm', 'Molave', 'Ipil', 'Toog', 'Dao'];
        foreach ($species as $sp) {
            if (stripos($text, $sp) !== false && !isset($seen[$sp])) {
                $entities[] = ['type' => 'species', 'value' => $sp];
                $seen[$sp] = true;
            }
        }

        // 5. Hazard keywords
        $hazards = ['Flood', 'Landslide', 'Storm Surge', 'Drought', 'Sea Level Rise', 'Liquefaction'];
        foreach ($hazards as $h) {
            if (stripos($text, $h) !== false && !isset($seen[$h])) {
                $entities[] = ['type' => 'hazard', 'value' => $h];
                $seen[$h] = true;
            }
        }

        return array_slice($entities, 0, 8);
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
Give concise, practical answers. Use markdown formatting where helpful:
- Use **bold** for barangay names, scores, and key terms.
- Use bullet lists (- item) when recommending multiple locations or listing criteria.
- Use numbered lists (1. item) for step-by-step guidance.
- Do NOT use headers (##) or code blocks.
Always cite specific barangay names and percentage scores when recommending locations.
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
        if (! empty($context['selection']) && $context['selection'] !== 'Panabo City') {
            $extra .= "\nUser is currently viewing barangay: {$context['selection']}";
            if (! empty($context['zone'])) {
                $extra .= " (Zone: {$context['zone']})";
            }
            if (! empty($context['suitability'])) {
                $extra .= " — suitability score on screen: {$context['suitability']}%";
            }
            $extra .= "\nIf the user says 'this', 'here', 'this area', or 'this barangay', they mean {$context['selection']}.";
        }

        return trim("User question: {$prompt}{$extra}");
    }

    private function normalizeAnswer(string $answer): string
    {
        return trim($answer);
    }
}
