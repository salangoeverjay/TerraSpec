<?php

namespace App\Services;

use App\Models\SuitabilityCriteria;
use App\Models\ZoneUnit;
use Illuminate\Support\Collection;

class SuitabilityScoreService
{
    // Maximum population density in Panabo City (Gredu, 2020 census)
    private const MAX_POP_DENSITY = 14910.0;

    private const SLOPE_SCORES = [
        '0-8'   => 1.00,
        '8-18'  => 0.80,
        '18-30' => 0.50,
        '30-50' => 0.10,
        '50+'   => 0.00,
    ];

    private const SOIL_SCORES = [
        'Camasan Sandy Clay Loam'    => 0.90,
        'Cabangan Clay Loam'         => 0.85,
        'San Manuel Silty Clay Loam' => 0.70,
        'Matina Clay Loam'           => 0.55,
    ];

    // Maps criteria_name to the score key used internally
    private const CRITERIA_SCORE_MAP = [
        'Flood Risk'         => 'flood',
        'Slope Suitability'  => 'slope',
        'Liquefaction Risk'  => 'liquefaction',
        'Population Density' => 'population',
        'Market Saturation'  => 'saturation',
        'Soil Suitability'   => 'soil',
        'Zoning Compliance'  => 'zoning',
    ];

    public function calculate(ZoneUnit $zone, string $analysisType, ?string $useSubtype = null): array
    {
        $zone->loadMissing(['hazardData', 'soilData']);
        $hazard = $zone->hazardData;
        $area   = (float) $zone->total_area_ha;

        // 1. FLOOD SCORE — weighted flood area as fraction of total, inverted
        $floodRaw = $area > 0
            ? (($hazard->flood_high_ha * 1.0) + ($hazard->flood_moderate_ha * 0.5) + ($hazard->flood_low_ha * 0.2)) / $area
            : 0;
        $floodScore = max(0.0, min(1.0, 1 - $floodRaw));

        // 2. SLOPE SCORE — lookup by dominant slope class
        $slopeScore = self::SLOPE_SCORES[$zone->dominant_slope_class] ?? 0.50;

        // 3. LIQUEFACTION SCORE — weighted exposure, inverted
        $liqRaw = $area > 0
            ? (($hazard->liquefaction_hsa_ha * 1.0) + ($hazard->liquefaction_msa_ha * 0.5) + ($hazard->liquefaction_lsa_ha * 0.2)) / $area
            : 0;
        $liquefactionScore = max(0.0, min(1.0, 1 - $liqRaw));

        // 4. POPULATION DENSITY SCORE — normalized against city max
        $populationScore = min(1.0, (float) $zone->population_density / self::MAX_POP_DENSITY);

        // 5. MARKET SATURATION SCORE — inverted (low saturation = high opportunity)
        $saturationScore = max(0.0, 1.0 - (float) $zone->saturation_index);

        // 6. SOIL SCORE — lookup by dominant soil type
        $soilScore = self::SOIL_SCORES[$zone->dominant_soil_type] ?? 0.50;

        // 7. ZONING COMPLIANCE SCORE — unit_type × analysis_type matrix
        $isUrban = $zone->unit_type === 'Urban';
        $capClass = $zone->land_capability_class;

        $zoningScore = match (true) {
            // Reforestation: favour degraded land (C/D = best fit)
            $analysisType === 'reforestation' && in_array($capClass, ['C', 'D']) => 1.00,
            $analysisType === 'reforestation'                                    => 0.50,
            // Urban zones suit commercial and residential best
            $isUrban && in_array($analysisType, ['commercial', 'residential'])  => 1.00,
            $isUrban && $analysisType === 'industrial'                           => 0.75,
            // Rural zones suit agricultural best; commercial is a mismatch
            !$isUrban && in_array($analysisType, ['agricultural'])               => 1.00,
            !$isUrban && $analysisType === 'commercial'                          => 0.50,
            default                                                              => 0.60,
        };

        $individualScores = [
            'flood'       => round($floodScore, 4),
            'slope'       => round($slopeScore, 4),
            'liquefaction'=> round($liquefactionScore, 4),
            'population'  => round($populationScore, 4),
            'saturation'  => round($saturationScore, 4),
            'soil'        => round($soilScore, 4),
            'zoning'      => round($zoningScore, 4),
        ];

        // 8. APPLY WEIGHTS — fetched from suitability_criteria, never hardcoded
        $criteriaRows   = SuitabilityCriteria::all();
        $appliedWeights = [];
        $totalScore     = 0.0;
        $breakdown      = [];

        foreach ($criteriaRows as $criterion) {
            $weight    = $criterion->getWeightForType($analysisType);
            $scoreKey  = self::CRITERIA_SCORE_MAP[$criterion->criteria_name] ?? null;
            $score     = $scoreKey ? ($individualScores[$scoreKey] ?? 0.0) : 0.0;
            $weighted  = $weight * $score;

            $appliedWeights[$criterion->criteria_name] = $weight;
            $breakdown[$criterion->criteria_name] = [
                'score'    => round($score, 4),
                'weight'   => $weight,
                'weighted' => round($weighted, 4),
            ];

            $totalScore += $weighted;
        }

        $totalScore = round(min(1.0, max(0.0, $totalScore)), 4);

        // 9. CLASSIFY
        $level = $this->classify($totalScore);

        return [
            'zone'          => $zone,
            'analysis_type' => $analysisType,
            'use_subtype'   => $useSubtype,
            'scores'        => $individualScores,
            'total_score'   => $totalScore,
            'total_pct'     => round($totalScore * 100, 1),
            'suitability_level' => $level,
            'criteria_breakdown'=> $breakdown,
            'applied_weights'   => $appliedWeights,
        ];
    }

    public function calculateAll(string $analysisType, ?string $useSubtype = null): Collection
    {
        $zones   = ZoneUnit::with(['hazardData', 'soilData'])->get();
        $results = $zones->map(function (ZoneUnit $zone) use ($analysisType, $useSubtype) {
            return $this->calculate($zone, $analysisType, $useSubtype);
        });

        return $results
            ->sortByDesc('total_score')
            ->values()
            ->map(function ($result, $index) {
                $result['rank'] = $index + 1;
                return $result;
            });
    }

    public function detectAnalysisType(string $nlpQuery): string
    {
        $q = strtolower($nlpQuery);

        // Checked in this exact order — first match wins
        $commercial    = ['grocery','store','mall','market','shop','retail',
                          'restaurant','cafe','bakery','pharmacy','clinic',
                          'hospital','school','hotel','gasoline','hardware'];

        $residential   = ['house','subdivision','condo','housing',
                          'residential','apartment','home','dwelling'];

        $industrial    = ['factory','warehouse','plant','industrial',
                          'manufacturing','storage','logistics','port'];

        $agricultural  = ['farm','crop','rice','banana','coconut',
                          'agricultural','plantation','irrigation','harvest'];

        $reforestation = ['plant','tree','reforest','forest','mangrove',
                          'native species','seedling','nursery','watershed'];

        foreach ($commercial    as $kw) { if (str_contains($q, $kw)) return 'commercial'; }
        foreach ($residential   as $kw) { if (str_contains($q, $kw)) return 'residential'; }
        foreach ($industrial    as $kw) { if (str_contains($q, $kw)) return 'industrial'; }
        foreach ($agricultural  as $kw) { if (str_contains($q, $kw)) return 'agricultural'; }
        foreach ($reforestation as $kw) { if (str_contains($q, $kw)) return 'reforestation'; }

        return 'commercial';
    }

    private function classify(float $score): string
    {
        if ($score >= 0.75) return 'Highly Suitable';
        if ($score >= 0.50) return 'Moderately Suitable';
        if ($score >= 0.25) return 'Low Suitability';
        return 'Not Suitable';
    }
}
