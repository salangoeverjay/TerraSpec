<?php

namespace App\Services;

use InvalidArgumentException;

class AhpService
{
    // Saaty's Random Consistency Index for n = 0..10
    private const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

    private const MAX_ITERATIONS = 1000;

    private const TOLERANCE = 1e-12;

    /**
     * Compute the AHP priority vector (principal eigenvector, by power iteration)
     * and Saaty's consistency metrics from a full n×n pairwise comparison matrix.
     *
     * @param  array  $matrix  Square n×n pairwise comparison matrix (floats).
     * @return array weights[], lambda_max, ci, cr, cr_pct, valid
     *
     * @throws InvalidArgumentException if the matrix is not square or contains non-positive values.
     */
    public function compute(array $matrix): array
    {
        $n = count($matrix);

        if ($n < 2) {
            throw new InvalidArgumentException('Matrix must be at least 2×2.');
        }

        foreach ($matrix as $i => $row) {
            if (count($row) !== $n) {
                throw new InvalidArgumentException("Row {$i} length does not match matrix dimension {$n}.");
            }
            foreach ($row as $j => $val) {
                if ((float) $val <= 0) {
                    throw new InvalidArgumentException("Matrix value at [{$i}][{$j}] must be positive.");
                }
            }
        }

        $matrix = array_map(fn (array $row): array => array_map('floatval', array_values($row)), array_values($matrix));

        foreach ($matrix as $i => $row) {
            foreach ($row as $j => $val) {
                if (abs($val * $matrix[$j][$i] - 1) > 1e-6) {
                    throw new InvalidArgumentException("Matrix is not reciprocal at [{$i}][{$j}].");
                }
            }
        }

        // 1–2. Power iteration → principal eigenvector, normalized to sum 1 (weights)
        $weights = array_fill(0, $n, 1 / $n);
        for ($iteration = 0; $iteration < self::MAX_ITERATIONS; $iteration++) {
            $next = $this->multiply($matrix, $weights);
            $total = array_sum($next);
            $next = array_map(fn (float $v): float => $v / $total, $next);

            $delta = max(array_map(fn (float $a, float $b): float => abs($a - $b), $next, $weights));
            $weights = $next;

            if ($delta < self::TOLERANCE) {
                break;
            }
        }

        // 3. Weighted sum vector: A × w
        $weightedSums = $this->multiply($matrix, $weights);

        // 4. λmax = (1/n) × Σ (Aw)_i / w_i
        $lambdaMax = 0.0;
        foreach ($weightedSums as $i => $ws) {
            $lambdaMax += $ws / $weights[$i];
        }
        $lambdaMax /= $n;

        // 5. Consistency Index: CI = (λmax − n) / (n − 1)
        $ci = ($lambdaMax - $n) / ($n - 1);

        // 6. Consistency Ratio: CR = CI / RI[n]
        if (! isset(self::RI[$n])) {
            throw new InvalidArgumentException('AHP supports at most 10 criteria (Saaty RI table).');
        }

        $cr = $n > 2 ? $ci / self::RI[$n] : 0.0;

        return [
            'n' => $n,
            'weights' => array_values($weights),
            'lambda_max' => round($lambdaMax, 4),
            'ci' => round($ci, 4),
            'cr' => round($cr, 4),
            'cr_pct' => round($cr * 100, 2),
            'valid' => $cr < 0.10,
        ];
    }

    /**
     * @param  array<int, array<int, float>>  $matrix
     * @param  array<int, float>  $vector
     * @return array<int, float>
     */
    private function multiply(array $matrix, array $vector): array
    {
        return array_map(
            fn (array $row): float => array_sum(array_map(fn (float $a, float $b): float => $a * $b, $row, $vector)),
            $matrix,
        );
    }
}
