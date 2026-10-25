<?php

namespace App\Services;

/**
 * One-at-a-time weight sensitivity analysis for AHP-WLC.
 *
 * Each criterion weight is moved by ±10% and ±20% (relative), the other weights are
 * rescaled proportionally so they still sum to 1, and the units passing the constraint
 * step are rescored. Reports how much usable area and how many units change suitability
 * class, plus how far the ranking moves. Under ~5% of area changing class is the usual
 * threshold for calling the result robust to that weight.
 */
class SuitabilitySensitivityService
{
    public const STEPS = [-0.20, -0.10, 0.10, 0.20];

    public const ROBUST_AREA_PCT = 5.0;

    public function __construct(private SuitabilityComparisonService $comparison) {}

    /**
     * @return array{analysis_type: string, eligible_units: int, total_area_ha: float, steps: array<int, float>, criteria: array<int, array<string, mixed>>, max_area_changed_pct: float, max_area_changed_pct_at_10: float, rank_comparable: bool, min_spearman: float|null, most_sensitive: string|null, robust: bool, robust_at_10: bool}
     */
    public function analyze(string $analysisType): array
    {
        ['criteria' => $criteria, 'eligible' => $eligible, 'matrix' => $matrix, 'ahp_weights' => $weights]
            = $this->comparison->decisionMatrix($analysisType);

        $areas = $eligible->map(fn (array $r): float => (float) ($r['constraint']['available_area_ha'] ?? $r['zone']->total_area_ha))->all();
        $totalArea = array_sum($areas);

        $baseScores = $this->comparison->wlc($matrix, $weights);
        $baseLevels = array_map(fn (float $s): string => $this->comparison->classify($s), $baseScores);
        $baseRanks = $this->comparison->ranks($baseScores);
        $baseTop = $this->topFive($baseRanks);
        // Rank correlation needs enough barangays; class changes by area stay meaningful for any number
        $comparable = count($matrix) >= SuitabilityComparisonService::MIN_COMPARABLE_UNITS;

        $rows = [];
        foreach ($criteria as $index => $name) {
            $cells = [];
            foreach (self::STEPS as $step) {
                $perturbed = $this->perturb($weights, $index, $step);
                $scores = $this->comparison->wlc($matrix, $perturbed);
                $ranks = $this->comparison->ranks($scores);

                $changed = array_keys(array_filter(
                    $scores,
                    fn (float $s, int $i): bool => $this->comparison->classify($s) !== $baseLevels[$i],
                    ARRAY_FILTER_USE_BOTH,
                ));
                $changedArea = array_sum(array_intersect_key($areas, array_flip($changed)));

                $cells[] = [
                    'step' => $step,
                    'weight' => round($perturbed[$index], 4),
                    'units_changed' => count($changed),
                    'area_changed_ha' => round($changedArea, 2),
                    'area_changed_pct' => $totalArea > 0 ? round(100 * $changedArea / $totalArea, 1) : 0.0,
                    'spearman' => $comparable ? round($this->comparison->spearman($baseScores, $scores), 3) : null,
                    'top5_overlap' => count(array_intersect($baseTop, $this->topFive($ranks))),
                    'changed_units' => array_map(fn (int $i): string => $eligible[$i]['zone']->unit_name, $changed),
                ];
            }

            $rows[] = [
                'criterion' => $name,
                'base_weight' => round($weights[$index], 4),
                'max_area_changed_pct' => max(array_column($cells, 'area_changed_pct')),
                'results' => $cells,
            ];
        }

        $maxArea = $rows === [] ? 0.0 : max(array_column($rows, 'max_area_changed_pct'));
        $maxAreaAtTen = 0.0;
        foreach ($rows as $row) {
            foreach ($row['results'] as $cell) {
                if (abs($cell['step']) <= 0.10 + 1e-9) {
                    $maxAreaAtTen = max($maxAreaAtTen, $cell['area_changed_pct']);
                }
            }
        }
        $mostSensitive = null;
        foreach ($rows as $row) {
            if ($mostSensitive === null || $row['max_area_changed_pct'] > $mostSensitive['max_area_changed_pct']) {
                $mostSensitive = $row;
            }
        }

        return [
            'analysis_type' => $analysisType,
            'eligible_units' => count($matrix),
            'total_area_ha' => round($totalArea, 2),
            'steps' => self::STEPS,
            'criteria' => $rows,
            'max_area_changed_pct' => $maxArea,
            'max_area_changed_pct_at_10' => $maxAreaAtTen,
            'rank_comparable' => $comparable,
            'min_spearman' => ! $comparable || $rows === [] ? null : min(array_merge(...array_map(fn (array $r): array => array_column($r['results'], 'spearman'), $rows))),
            'most_sensitive' => $mostSensitive && $mostSensitive['max_area_changed_pct'] > 0 ? $mostSensitive['criterion'] : null,
            'robust' => $maxArea < self::ROBUST_AREA_PCT,
            'robust_at_10' => $maxAreaAtTen < self::ROBUST_AREA_PCT,
        ];
    }

    /**
     * Move one weight by a relative step and rescale the others so the weights still sum to 1.
     *
     * @param  array<int, float>  $weights
     * @return array<int, float>
     */
    public function perturb(array $weights, int $index, float $step): array
    {
        $new = min(1.0, max(0.0, $weights[$index] * (1 + $step)));
        $rest = 1.0 - $weights[$index];
        $scale = $rest > 0 ? (1.0 - $new) / $rest : 0.0;

        $result = [];
        foreach ($weights as $i => $w) {
            $result[$i] = $i === $index ? $new : $w * $scale;
        }

        return $result;
    }

    /**
     * @param  array<int, int>  $ranks
     * @return array<int, int>
     */
    private function topFive(array $ranks): array
    {
        return array_keys(array_filter($ranks, fn (int $rank): bool => $rank <= 5));
    }
}
