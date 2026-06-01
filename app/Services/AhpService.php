<?php

namespace App\Services;

use InvalidArgumentException;

class AhpService
{
    // Saaty's Random Consistency Index for n = 0..9
    private const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45];

    /**
     * Compute AHP priority vector and consistency metrics from a full n×n matrix.
     *
     * @param  array  $matrix  Square n×n pairwise comparison matrix (floats).
     * @return array  weights[], lambda_max, ci, cr, cr_pct, valid
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

        // 1. Column sums
        $colSums = array_fill(0, $n, 0.0);
        foreach ($matrix as $row) {
            foreach ($row as $j => $val) {
                $colSums[$j] += (float) $val;
            }
        }

        // 2. Normalize each column → row averages = priority vector (weights)
        $weights = [];
        foreach ($matrix as $i => $row) {
            $rowSum = 0.0;
            foreach ($row as $j => $val) {
                $rowSum += (float) $val / $colSums[$j];
            }
            $weights[$i] = $rowSum / $n;
        }

        // 3. Weighted sum vector: A × w
        $weightedSums = [];
        foreach ($matrix as $i => $row) {
            $sum = 0.0;
            foreach ($row as $j => $val) {
                $sum += (float) $val * $weights[$j];
            }
            $weightedSums[$i] = $sum;
        }

        // 4. λmax = (1/n) × Σ (Aw)_i / w_i
        $lambdaMax = 0.0;
        foreach ($weightedSums as $i => $ws) {
            $lambdaMax += $ws / $weights[$i];
        }
        $lambdaMax /= $n;

        // 5. Consistency Index: CI = (λmax − n) / (n − 1)
        $ci = ($lambdaMax - $n) / ($n - 1);

        // 6. Consistency Ratio: CR = CI / RI[n]
        $ri = self::RI[$n] ?? 1.45;
        $cr = $n > 2 ? $ci / $ri : 0.0;

        return [
            'n'          => $n,
            'weights'    => array_values($weights),
            'lambda_max' => round($lambdaMax, 4),
            'ci'         => round($ci, 4),
            'cr'         => round($cr, 4),
            'cr_pct'     => round($cr * 100, 2),
            'valid'      => $cr <= 0.10,
        ];
    }
}
