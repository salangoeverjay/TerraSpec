<?php

namespace App\Services;

use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Compares four multi-criteria decision methods on the same decision matrix, as a
 * 2×2 design: weighting (AHP expert weights vs. EWM entropy weights) × aggregation
 * (WLC weighted sum vs. TOPSIS closeness to the ideal solution).
 *
 * All methods use the 0-1 benefit-oriented criterion scores and the CLUP constraint
 * (sieve) step from SuitabilityScoreService, so differences come only from the
 * weighting and aggregation. Only criteria with an AHP weight > 0 for the analysis
 * type are used, so every method judges the same criteria.
 */
class SuitabilityComparisonService
{
    public const METHODS = [
        'ahp_wlc' => 'AHP-WLC',
        'ahp_topsis' => 'AHP-TOPSIS',
        'ewm_wlc' => 'EWM-WLC',
        'ewm_topsis' => 'EWM-TOPSIS',
    ];

    /**
     * With fewer eligible barangays, entropy weights, TOPSIS closeness and rank correlation have no
     * meaning (one unit is always "ideal", two units always correlate ±1), so only AHP-WLC is reported.
     */
    public const MIN_COMPARABLE_UNITS = 3;

    /**
     * WLC scores are absolute, so they use the suitability classes; TOPSIS closeness is relative to the
     * best and worst unit in the set, so TOPSIS levels are rank quarters.
     */
    public const LEVEL_BASIS = [
        'ahp_wlc' => 'score',
        'ahp_topsis' => 'rank',
        'ewm_wlc' => 'score',
        'ewm_topsis' => 'rank',
    ];

    private const EPSILON = 1e-12;

    public function __construct(private SuitabilityScoreService $scorer) {}

    /**
     * @return array{analysis_type: string, comparable: bool, minimum_units: int, level_basis: array<string, string>, criteria: array<int, string>, weights: array{ahp: array<string, float>, ewm: array<string, float>|null}, units: array<int, array<string, mixed>>, agreement: array<string, mixed>}
     */
    public function compare(string $analysisType): array
    {
        ['criteria' => $criteria, 'eligible' => $eligible, 'excluded' => $excluded, 'matrix' => $matrix, 'ahp_weights' => $ahpWeights]
            = $this->decisionMatrix($analysisType);

        $count = count($matrix);
        $comparable = $count >= self::MIN_COMPARABLE_UNITS;
        $ewmWeights = $comparable ? $this->entropyWeights($matrix) : null;

        // Below the minimum only AHP-WLC is computed; the other methods are reported as not comparable
        $scores = ['ahp_wlc' => $this->wlc($matrix, $ahpWeights)];
        if ($comparable) {
            $scores['ahp_topsis'] = $this->topsis($matrix, $ahpWeights);
            $scores['ewm_wlc'] = $this->wlc($matrix, $ewmWeights);
            $scores['ewm_topsis'] = $this->topsis($matrix, $ewmWeights);
        }
        $ranks = array_map(fn (array $s): array => $this->ranks($s), $scores);

        $units = $eligible->map(function (array $r, int $i) use ($scores, $ranks, $count): array {
            $methods = [];
            foreach (array_keys(self::METHODS) as $key) {
                $methods[$key] = isset($scores[$key]) ? [
                    'score' => round($scores[$key][$i], 4),
                    'rank' => $ranks[$key][$i],
                    'level' => $this->level($key, $scores[$key][$i], $ranks[$key][$i], $count),
                ] : null;
            }

            return $this->unitRow($r, false, $methods);
        })->all();

        foreach ($excluded as $r) {
            $units[] = $this->unitRow($r, true, null);
        }

        usort($units, fn (array $a, array $b): int => ($a['excluded'] <=> $b['excluded'])
            ?: (($a['methods']['ahp_wlc']['rank'] ?? 0) <=> ($b['methods']['ahp_wlc']['rank'] ?? 0)));

        $rounded = fn (array $weights): array => array_combine($criteria, array_map(fn (float $w): float => round($w, 4), $weights));

        return [
            'analysis_type' => $analysisType,
            'comparable' => $comparable,
            'minimum_units' => self::MIN_COMPARABLE_UNITS,
            'level_basis' => self::LEVEL_BASIS,
            'criteria' => $criteria,
            'weights' => [
                'ahp' => $rounded($ahpWeights),
                'ewm' => $ewmWeights === null ? null : $rounded($ewmWeights),
            ],
            'units' => $units,
            'agreement' => $comparable ? $this->agreement($scores, $ranks, $count) : [
                'eligible_units' => $count,
                'spearman' => null,
                'top5_overlap' => null,
                'mean_rank_shift' => null,
                'level_agreement' => null,
            ],
        ];
    }

    /**
     * Rank quarter of a unit among $count units (1 = best): the level used for TOPSIS closeness.
     */
    public function rankQuarter(int $rank, int $count): string
    {
        $position = ($rank - 1) / max(1, $count);

        return match (true) {
            $position < 0.25 => 'Top quarter',
            $position < 0.50 => 'Second quarter',
            $position < 0.75 => 'Third quarter',
            default => 'Bottom quarter',
        };
    }

    private function level(string $method, float $score, int $rank, int $count): string
    {
        return self::LEVEL_BASIS[$method] === 'rank' ? $this->rankQuarter($rank, $count) : $this->classify($score);
    }

    /**
     * Criterion scores of the units that pass the constraint step, for the criteria with
     * an AHP weight > 0 for this analysis type, plus the normalized AHP weights.
     *
     * @return array{criteria: array<int, string>, eligible: Collection<int, array<string, mixed>>, excluded: Collection<int, array<string, mixed>>, matrix: array<int, array<int, float>>, ahp_weights: array<int, float>}
     */
    public function decisionMatrix(string $analysisType): array
    {
        $results = $this->scorer->calculateAll($analysisType);

        $first = $results->first();
        $criteria = array_keys(array_filter(
            $first['criteria_breakdown'] ?? [],
            fn (array $c): bool => $c['weight'] > 0,
        ));

        $eligible = $results->filter(fn (array $r): bool => ! ($r['constraint']['excluded'] ?? false))->values();
        $excluded = $results->filter(fn (array $r): bool => $r['constraint']['excluded'] ?? false)->values();

        $matrix = $eligible->map(fn (array $r): array => array_map(
            fn (string $c): float => (float) $r['criteria_breakdown'][$c]['score'],
            $criteria,
        ))->all();

        return [
            'criteria' => $criteria,
            'eligible' => $eligible,
            'excluded' => $excluded,
            'matrix' => $matrix,
            'ahp_weights' => $this->normalize(array_map(fn (string $c): float => (float) $first['criteria_breakdown'][$c]['weight'], $criteria)),
        ];
    }

    /**
     * Entropy Weight Method: criteria whose scores vary more across units get more weight.
     *
     * @param  array<int, array<int, float>>  $matrix  m units × n criteria, values ≥ 0
     * @return array<int, float>
     */
    public function entropyWeights(array $matrix): array
    {
        $m = count($matrix);
        if ($m < 2) {
            throw new InvalidArgumentException('EWM needs at least two alternatives.');
        }

        $n = count($matrix[0]);
        $k = 1 / log($m);
        $divergence = [];

        for ($j = 0; $j < $n; $j++) {
            $column = array_column($matrix, $j);
            $sum = array_sum($column);

            if ($sum <= self::EPSILON) {
                $divergence[$j] = 0.0;

                continue;
            }

            $entropy = 0.0;
            foreach ($column as $value) {
                $p = $value / $sum;
                if ($p > 0) {
                    $entropy -= $p * log($p);
                }
            }
            $divergence[$j] = max(0.0, 1 - $k * $entropy);
        }

        $total = array_sum($divergence);

        return $total > self::EPSILON
            ? array_map(fn (float $d): float => $d / $total, $divergence)
            : array_fill(0, $n, 1 / $n);
    }

    /**
     * Weighted linear combination (simple additive weighting).
     *
     * @param  array<int, array<int, float>>  $matrix
     * @param  array<int, float>  $weights
     * @return array<int, float>
     */
    public function wlc(array $matrix, array $weights): array
    {
        return array_map(
            fn (array $row): float => array_sum(array_map(fn (float $x, float $w): float => $x * $w, $row, $weights)),
            $matrix,
        );
    }

    /**
     * TOPSIS with vector normalization; all criteria are benefit criteria (higher = better).
     * Returns the relative closeness to the ideal solution (0-1) for each alternative.
     *
     * @param  array<int, array<int, float>>  $matrix
     * @param  array<int, float>  $weights
     * @return array<int, float>
     */
    public function topsis(array $matrix, array $weights): array
    {
        if ($matrix === []) {
            return [];
        }

        $n = count($weights);
        $norms = [];
        for ($j = 0; $j < $n; $j++) {
            $norms[$j] = sqrt(array_sum(array_map(fn (float $x): float => $x * $x, array_column($matrix, $j))));
        }

        $weighted = array_map(fn (array $row): array => array_map(
            fn (float $x, int $j): float => $norms[$j] > self::EPSILON ? $weights[$j] * $x / $norms[$j] : 0.0,
            $row,
            array_keys($row),
        ), $matrix);

        $best = [];
        $worst = [];
        for ($j = 0; $j < $n; $j++) {
            $column = array_column($weighted, $j);
            $best[$j] = max($column);
            $worst[$j] = min($column);
        }

        return array_map(function (array $row) use ($best, $worst): float {
            $toBest = sqrt(array_sum(array_map(fn (float $v, float $b): float => ($v - $b) ** 2, $row, $best)));
            $toWorst = sqrt(array_sum(array_map(fn (float $v, float $w): float => ($v - $w) ** 2, $row, $worst)));

            return $toBest + $toWorst > self::EPSILON ? $toWorst / ($toBest + $toWorst) : 1.0;
        }, $weighted);
    }

    /**
     * Spearman rank correlation (Pearson correlation of average ranks, so ties are handled).
     *
     * @param  array<int, float>  $a
     * @param  array<int, float>  $b
     */
    public function spearman(array $a, array $b): float
    {
        $ra = $this->ranks($a, average: true);
        $rb = $this->ranks($b, average: true);
        $n = count($ra);
        if ($n < 2) {
            return 1.0;
        }

        $meanA = array_sum($ra) / $n;
        $meanB = array_sum($rb) / $n;
        $cov = $varA = $varB = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $cov += ($ra[$i] - $meanA) * ($rb[$i] - $meanB);
            $varA += ($ra[$i] - $meanA) ** 2;
            $varB += ($rb[$i] - $meanB) ** 2;
        }

        return $varA > 0 && $varB > 0 ? $cov / sqrt($varA * $varB) : 1.0;
    }

    /**
     * Rank by descending score (1 = best). Ties get the same competition rank,
     * or the average rank when $average is true.
     *
     * @param  array<int, float>  $scores
     * @return array<int, float|int>
     */
    public function ranks(array $scores, bool $average = false): array
    {
        $order = $scores;
        arsort($order);
        $ranks = [];
        $position = 0;
        $values = array_values($order);
        $keys = array_keys($order);
        $count = count($values);

        while ($position < $count) {
            $end = $position;
            while ($end + 1 < $count && abs($values[$end + 1] - $values[$position]) < 1e-9) {
                $end++;
            }
            $rank = $average ? ($position + $end) / 2 + 1 : $position + 1;
            for ($i = $position; $i <= $end; $i++) {
                $ranks[$keys[$i]] = $rank;
            }
            $position = $end + 1;
        }

        ksort($ranks);

        return $ranks;
    }

    /**
     * @param  array<string, array<int, float>>  $scores
     * @param  array<string, array<int, int>>  $ranks
     * @return array{eligible_units: int, spearman: array<string, array<string, float>>, top5_overlap: array<string, int>, mean_rank_shift: array<string, float>, level_agreement: array<string, float>}
     */
    private function agreement(array $scores, array $ranks, int $eligibleCount): array
    {
        $keys = array_keys(self::METHODS);
        $spearman = [];
        foreach ($keys as $a) {
            foreach ($keys as $b) {
                $spearman[$a][$b] = round($this->spearman($scores[$a], $scores[$b]), 3);
            }
        }

        $topOf = fn (string $key): array => array_keys(array_filter($ranks[$key], fn (int $rank): bool => $rank <= 5));
        $baseTop = $topOf('ahp_wlc');

        // Levels are compared on the method's own basis: suitability class for WLC, rank quarter for
        // TOPSIS (AHP-WLC's rank quarter is the baseline then), never a TOPSIS closeness against WLC classes
        $levelsOf = fn (string $key, string $basis): array => array_map(
            fn (float $s, int $rank): string => $basis === 'rank' ? $this->rankQuarter($rank, $eligibleCount) : $this->classify($s),
            $scores[$key],
            $ranks[$key],
        );

        $overlap = $shift = $levels = [];
        foreach ($keys as $key) {
            $overlap[$key] = count(array_intersect($baseTop, $topOf($key)));
            $shift[$key] = $eligibleCount > 0
                ? round(array_sum(array_map(fn (int $a, int $b): int => abs($a - $b), $ranks['ahp_wlc'], $ranks[$key])) / $eligibleCount, 2)
                : 0.0;
            $basis = self::LEVEL_BASIS[$key];
            $same = array_filter(array_map(
                fn (string $level, string $base): bool => $level === $base,
                $levelsOf($key, $basis),
                $levelsOf('ahp_wlc', $basis),
            ));
            $levels[$key] = $eligibleCount > 0 ? round(100 * count($same) / $eligibleCount, 1) : 0.0;
        }

        return [
            'eligible_units' => $eligibleCount,
            'spearman' => $spearman,
            'top5_overlap' => $overlap,
            'mean_rank_shift' => $shift,
            'level_agreement' => $levels,
        ];
    }

    /**
     * @param  array<string, mixed>  $result
     * @param  array<string, array{score: float, rank: int, level: string}>|null  $methods
     * @return array<string, mixed>
     */
    private function unitRow(array $result, bool $excluded, ?array $methods): array
    {
        return [
            'zone_unit_id' => $result['zone']->zone_unit_id,
            'unit_name' => $result['zone']->unit_name,
            'unit_type' => $result['zone']->unit_type,
            'excluded' => $excluded,
            'available_area_ha' => $result['constraint']['available_area_ha'] ?? null,
            'exclusion_reason' => $excluded ? array_key_first($result['constraint']['reasons']) : null,
            'methods' => $methods,
        ];
    }

    /**
     * @param  array<int, float>  $weights
     * @return array<int, float>
     */
    private function normalize(array $weights): array
    {
        $total = array_sum($weights);

        return $total > 0 ? array_map(fn (float $w): float => $w / $total, $weights) : $weights;
    }

    public function classify(float $score): string
    {
        if ($score >= 0.75) {
            return 'Highly Suitable';
        }
        if ($score >= 0.50) {
            return 'Moderately Suitable';
        }
        if ($score >= 0.25) {
            return 'Low Suitability';
        }

        return 'Not Suitable';
    }
}
