<?php

namespace App\Services;

use App\Models\MangroveSpecies;
use App\Models\ZoneUnit;
use Illuminate\Support\Str;

/**
 * Ties an AI answer back to TerraSpec's own records: the suitability chips, live calculation and
 * entities come from the database (never from the model's text), and the report narrative always
 * carries the required disclaimer.
 */
class ChatResponseGrounder
{
    public function __construct(
        private SuitabilityScoreService $scorer,
        private ReforestationStudyArea $studyArea,
        private AnalysisTypeDetector $detector,
    ) {}

    public function intent(string $prompt): string
    {
        if (preg_match('/flood|hazard|landslide|storm.surge|sea.level|drought|restrict|protected|watershed|mangrove.park|cenro/i', $prompt)) {
            return 'environmental_assessment';
        }
        if (preg_match('/zone|zoning|ordinance|setback|allowed.use|permit|compliance|classification/i', $prompt)) {
            return 'zoning_compliance';
        }

        return match ($this->detector->detect($prompt)) {
            'residential' => 'residential_suitability',
            'industrial' => 'industrial_suitability',
            'agricultural' => 'agricultural_suitability',
            'reforestation' => 'reforestation',
            default => 'commercial_suitability',
        };
    }

    /**
     * Live suitability of the barangays the answer names (one chip each, at most 5). Not shown on zoning
     * or hazard answers, where a default commercial score would be unrelated to the question.
     *
     * @return array<int, array<string, mixed>>
     */
    public function recommendedZones(string $answer, string $prompt, string $intent): array
    {
        if (in_array($intent, ['environmental_assessment', 'zoning_compliance'], true)) {
            return [];
        }

        $mentionedIds = ZoneUnit::all(['zone_unit_id', 'unit_name'])
            ->filter(fn (ZoneUnit $zone) => $this->mentions($answer, $zone->unit_name))
            ->pluck('zone_unit_id')
            ->all();

        if ($mentionedIds === []) {
            return [];
        }

        $type = $this->detector->detect($prompt);

        // Live scores (already limited to the study area for reforestation)
        return $this->scorer->calculateAll($type)
            ->filter(fn (array $r) => in_array($r['zone']->zone_unit_id, $mentionedIds, true))
            ->take(5)
            ->map(fn (array $r) => [
                'zone_unit_id' => $r['zone']->zone_unit_id,
                'unit_name' => $r['zone']->unit_name,
                'unit_type' => $r['zone']->unit_type,
                'total_pct' => $r['total_pct'],
                'suitability_level' => $r['suitability_level'],
                'analysis_type' => $type,
            ])
            ->values()
            ->all();
    }

    /**
     * A live AHP-WLC result when the user explicitly asks to calculate or assess one named barangay.
     *
     * @return array<string, mixed>|null
     */
    public function liveCalculation(string $prompt): ?array
    {
        $hasTrigger = (bool) preg_match(
            '/\b(calculat|comput|run.{0,10}anal|analyz|evaluat|how.{0,10}suitable|suitability.{0,20}(score|of|for)|score.{0,10}of|assess)\b/i',
            $prompt
        );

        if (! $hasTrigger) {
            return null;
        }

        $matched = ZoneUnit::with(['hazardData', 'soilData'])->get()->first(fn (ZoneUnit $zone) => $this->mentions($prompt, $zone->unit_name));
        if (! $matched || ! $matched->hazardData) {
            return null;
        }

        $type = $this->detector->detect($prompt);

        // Reforestation is only assessed in the study area (barangays with mapped sites)
        if (! $this->studyArea->includes($type, $matched->zone_unit_id)) {
            return null;
        }

        $result = $this->scorer->calculate($matched, $type);

        return [
            'zone_unit_id' => $matched->zone_unit_id,
            'zone_name' => $matched->unit_name,
            'zone_type' => $matched->unit_type,
            'analysis_type' => $type,
            'total_pct' => $result['total_pct'],
            'suitability_level' => $result['suitability_level'],
            'criteria_breakdown' => $result['criteria_breakdown'],
        ];
    }

    /**
     * Barangays, zoning classes, mangrove species and hazards named in the question or answer, taken
     * only from TerraSpec's own lists (at most 8).
     *
     * @return array<int, array{type: string, value: string}>
     */
    public function entities(string $prompt, string $answer): array
    {
        $text = $prompt.' '.$answer;
        $entities = [];

        foreach (ZoneUnit::pluck('unit_name') as $name) {
            if ($this->mentions($text, $name)) {
                $entities[] = ['type' => 'barangay', 'value' => $name];
            }
        }

        // Zoning classes of the Integrated Zoning Map, by name (e.g. "General Commercial")
        $zoningClasses = array_diff_key(config('suitability.constraint_labels', []), array_flip(['flood_very_high', 'landslide_high']));
        foreach ($zoningClasses as $label) {
            if ($this->mentions($text, trim(explode('/', $label)[0]))) {
                $entities[] = ['type' => 'zone', 'value' => $label];
            }
        }

        foreach (MangroveSpecies::pluck('local_name') as $species) {
            if ($this->mentions($text, $species)) {
                $entities[] = ['type' => 'species', 'value' => $species];
            }
        }

        // Substring match on purpose, so "flooding" and "landslides" count
        foreach (['Flood', 'Landslide', 'Storm Surge', 'Drought', 'Sea Level Rise', 'Liquefaction'] as $hazard) {
            if (stripos($text, $hazard) !== false) {
                $entities[] = ['type' => 'hazard', 'value' => $hazard];
            }
        }

        return array_slice(array_values(array_unique($entities, SORT_REGULAR)), 0, 8);
    }

    /**
     * Plain-prose narrative for a report, always ending with the required disclaimer.
     */
    public function narrative(string $text): string
    {
        $narrative = trim(str_replace('*', '', $text));

        if ($narrative === '' || str_contains($narrative, ChatPromptBuilder::NARRATIVE_DISCLAIMER)) {
            return $narrative;
        }

        return $narrative.' '.ChatPromptBuilder::NARRATIVE_DISCLAIMER;
    }

    /**
     * Whole-word, case- and accent-insensitive match ("Santo Niño" matches "Santo Nino", "Dapco" does not
     * match inside another word).
     */
    private function mentions(string $text, string $name): bool
    {
        $needle = Str::lower(Str::ascii($name));

        return $needle !== ''
            && (bool) preg_match('/(?<![a-z0-9])'.preg_quote($needle, '/').'(?![a-z0-9])/', Str::lower(Str::ascii($text)));
    }
}
