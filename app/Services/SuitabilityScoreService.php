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
        '0-8' => 1.00,
        '8-18' => 0.80,
        '18-30' => 0.50,
        '30-50' => 0.10,
        '50+' => 0.00,
    ];

    private const SOIL_SCORES = [
        'Camasan Sandy Clay Loam' => 0.90,
        'Cabangan Clay Loam' => 0.85,
        'San Manuel Silty Clay Loam' => 0.70,
        'Matina Clay Loam' => 0.55,
    ];

    // Maps criteria_name to the score key used internally
    private const CRITERIA_SCORE_MAP = [
        'Flood Risk' => 'flood',
        'Slope Suitability' => 'slope',
        'Liquefaction Risk' => 'liquefaction',
        'Population Density' => 'population',
        'Market Saturation' => 'saturation',
        'Soil Suitability' => 'soil',
        'Zoning Compliance' => 'zoning',
    ];

    /**
     * Constraint-masked AHP weighted linear combination:
     * 1) remove land excluded for this analysis type (config/suitability.php, CLUP sieve);
     * 2) score each criterion 0-1 and combine with the AHP weights in suitability_criteria.
     */
    public function calculate(ZoneUnit $zone, string $analysisType, ?string $useSubtype = null): array
    {
        $zone->loadMissing(['hazardData', 'soilData', 'zoningData']);
        $hazard = $zone->hazardData;
        $area = (float) $zone->total_area_ha;

        $constraint = $this->evaluateConstraints($zone, $analysisType);

        // 1. FLOOD SCORE — weighted flood area as a share of the barangay total in CLUP Table PF-19
        //    (each CLUP hazard table reports its own barangay total), inverted
        $floodTotal = $this->tableTotal([$hazard->flood_high_ha, $hazard->flood_moderate_ha, $hazard->flood_low_ha, $hazard->flood_none_ha], $area);
        $floodRaw = $floodTotal > 0
            ? (($hazard->flood_high_ha * 1.0) + ($hazard->flood_moderate_ha * 0.5) + ($hazard->flood_low_ha * 0.2)) / $floodTotal
            : 0;
        $floodScore = max(0.0, min(1.0, 1 - $floodRaw));

        // 2. SLOPE SCORE — lookup by dominant slope class
        $slopeScore = self::SLOPE_SCORES[$zone->dominant_slope_class] ?? 0.50;

        // 3. LIQUEFACTION SCORE — weighted exposure as a share of the barangay total in CLUP Table PF-26, inverted
        $liqTotal = $this->tableTotal([$hazard->liquefaction_hsa_ha, $hazard->liquefaction_msa_ha, $hazard->liquefaction_lsa_ha, $hazard->liquefaction_none_ha], $area);
        $liqRaw = $liqTotal > 0
            ? (($hazard->liquefaction_hsa_ha * 1.0) + ($hazard->liquefaction_msa_ha * 0.5) + ($hazard->liquefaction_lsa_ha * 0.2)) / $liqTotal
            : 0;
        $liquefactionScore = max(0.0, min(1.0, 1 - $liqRaw));

        // 4. POPULATION DENSITY SCORE — normalized against city max
        $populationScore = min(1.0, (float) $zone->population_density / self::MAX_POP_DENSITY);

        // 5. MARKET SATURATION SCORE — inverted (low saturation = high opportunity)
        $saturationScore = max(0.0, 1.0 - (float) $zone->saturation_index);

        // 6. SOIL SCORE — area-weighted over every soil type in the barangay (CLUP Table PF-9);
        //    falls back to the dominant soil type when no soil areas are recorded
        $soilScore = $this->soilScore($zone);

        // 7. ZONING COMPLIANCE SCORE — share of the unconstrained zoned land whose
        //    Integrated Zoning Map class permits this use; unit_type matrix as fallback
        $isUrban = $zone->unit_type === 'Urban';
        $capClass = $zone->land_capability_class;

        $zoningScore = $constraint !== null && $constraint['available_zoned_ha'] > 0
            ? $this->zoningCompliance($constraint['available_by_zone'], $analysisType)
            : match (true) {
                // Reforestation: favour degraded land (C/D = best fit)
                $analysisType === 'reforestation' && in_array($capClass, ['C', 'D']) => 1.00,
                $analysisType === 'reforestation' => 0.50,
                // Urban zones suit commercial and residential best
                $isUrban && in_array($analysisType, ['commercial', 'residential']) => 1.00,
                $isUrban && $analysisType === 'industrial' => 0.75,
                // Rural zones suit agricultural best; commercial is a mismatch
                ! $isUrban && in_array($analysisType, ['agricultural']) => 1.00,
                ! $isUrban && $analysisType === 'commercial' => 0.50,
                default => 0.60,
            };

        $individualScores = [
            'flood' => round($floodScore, 4),
            'slope' => round($slopeScore, 4),
            'liquefaction' => round($liquefactionScore, 4),
            'population' => round($populationScore, 4),
            'saturation' => round($saturationScore, 4),
            'soil' => round($soilScore, 4),
            'zoning' => round($zoningScore, 4),
        ];

        // 8. APPLY WEIGHTS — fetched from suitability_criteria, never hardcoded
        $criteriaRows = SuitabilityCriteria::all();
        $appliedWeights = [];
        $totalScore = 0.0;
        $breakdown = [];

        foreach ($criteriaRows as $criterion) {
            $weight = $criterion->getWeightForType($analysisType);
            $scoreKey = self::CRITERIA_SCORE_MAP[$criterion->criteria_name] ?? null;
            $score = $scoreKey ? ($individualScores[$scoreKey] ?? 0.0) : 0.0;
            $weighted = $weight * $score;

            $appliedWeights[$criterion->criteria_name] = $weight;
            $breakdown[$criterion->criteria_name] = [
                'score' => round($score, 4),
                'weight' => $weight,
                'weighted' => round($weighted, 4),
            ];

            $totalScore += $weighted;
        }

        $totalScore = round(min(1.0, max(0.0, $totalScore)), 4);

        // 9. CLASSIFY — constrained units are Not Suitable regardless of score
        $isExcluded = $constraint['excluded'] ?? false;
        if ($isExcluded) {
            $totalScore = 0.0;
        }
        $level = $isExcluded ? 'Not Suitable' : $this->classify($totalScore);

        return [
            'zone' => $zone,
            'analysis_type' => $analysisType,
            'use_subtype' => $useSubtype,
            'scores' => $individualScores,
            'total_score' => $totalScore,
            'total_pct' => round($totalScore * 100, 1),
            'suitability_level' => $level,
            'criteria_breakdown' => $breakdown,
            'applied_weights' => $appliedWeights,
            'constraint' => $constraint === null ? null : [
                'excluded' => $isExcluded,
                'available_share' => round($constraint['available_share'], 4),
                'available_area_ha' => round($constraint['available_share'] * $area, 2),
                'constrained_ha' => round($constraint['constrained_ha'], 2),
                'reasons' => $constraint['reasons'],
            ],
        ];
    }

    private function soilScore(ZoneUnit $zone): float
    {
        $soil = $zone->soilData;
        $areas = $soil ? [
            'Cabangan Clay Loam' => (float) $soil->cabangan_clay_loam_ha,
            'Camasan Sandy Clay Loam' => (float) $soil->camasan_sandy_clay_loam_ha,
            'Matina Clay Loam' => (float) $soil->matina_clay_loam_ha,
            'San Manuel Silty Clay Loam' => (float) $soil->san_manuel_silty_clay_loam_ha,
        ] : [];
        $total = array_sum($areas);

        if ($total <= 0) {
            return self::SOIL_SCORES[$zone->dominant_soil_type] ?? 0.50;
        }

        $weighted = 0.0;
        foreach ($areas as $type => $ha) {
            $weighted += $ha * self::SOIL_SCORES[$type];
        }

        return $weighted / $total;
    }

    /**
     * Barangay total of a CLUP hazard table (sum of its classes); falls back to the zone unit area
     * when the table has no area recorded for the barangay.
     *
     * @param  array<int, mixed>  $classes
     */
    private function tableTotal(array $classes, float $fallbackArea): float
    {
        $total = array_sum(array_map('floatval', $classes));

        return $total > 0 ? $total : $fallbackArea;
    }

    /**
     * Sieve step: remove zoned land excluded for this analysis type and land under the
     * configured hazard constraints. Flood and landslide parts of a zoning class are added
     * (capped at the class area), as they rarely overlap (lowland vs. upland).
     *
     * @return array{excluded: bool, zoned_area_ha: float, constrained_ha: float, available_zoned_ha: float, available_share: float, available_by_zone: array<string, float>, reasons: array<string, float>}|null
     */
    private function evaluateConstraints(ZoneUnit $zone, string $analysisType): ?array
    {
        $rows = $zone->zoningData->where('zoning_code', '!=', 'NONE');
        if ($rows->isEmpty()) {
            return null;
        }

        $rules = config("suitability.constraints.{$analysisType}", []);
        $excludedZones = $rules['zoning'] ?? [];
        $labels = config('suitability.constraint_labels', []);

        $zonedArea = 0.0;
        $constrained = 0.0;
        $availableByZone = [];
        $reasons = [];

        foreach ($rows as $row) {
            $code = $row->zoning_code;
            $rowArea = (float) $row->area_ha;
            $zonedArea += $rowArea;

            if (in_array($code, $excludedZones, true)) {
                $constrained += $rowArea;
                $label = $labels[$code] ?? $code;
                $reasons[$label] = ($reasons[$label] ?? 0) + $rowArea;

                continue;
            }

            $flood = ($rules['flood_very_high'] ?? false) ? (float) $row->flood_very_high_ha : 0.0;
            $slide = ($rules['landslide_high'] ?? false) ? (float) $row->landslide_high_ha : 0.0;
            $hazardHa = min($rowArea, $flood + $slide);

            if ($flood > 0) {
                $reasons[$labels['flood_very_high']] = ($reasons[$labels['flood_very_high']] ?? 0) + $flood;
            }
            if ($slide > 0) {
                $reasons[$labels['landslide_high']] = ($reasons[$labels['landslide_high']] ?? 0) + $slide;
            }

            $constrained += $hazardHa;
            $availableByZone[$code] = ($availableByZone[$code] ?? 0) + $rowArea - $hazardHa;
        }

        $availableShare = $zonedArea > 0 ? max(0.0, 1 - $constrained / $zonedArea) : 0.0;
        arsort($reasons);

        return [
            'excluded' => $availableShare < (float) config('suitability.min_available_share', 0.05),
            'zoned_area_ha' => $zonedArea,
            'constrained_ha' => $constrained,
            'available_zoned_ha' => array_sum($availableByZone),
            'available_share' => $availableShare,
            'available_by_zone' => $availableByZone,
            'reasons' => array_map(fn (float $ha): float => round($ha, 2), $reasons),
        ];
    }

    /**
     * Area-weighted compatibility of the available zoning classes with the analysis type.
     *
     * @param  array<string, float>  $availableByZone
     */
    private function zoningCompliance(array $availableByZone, string $analysisType): float
    {
        $compatibility = config("suitability.zoning_compatibility.{$analysisType}", []);
        $total = array_sum($availableByZone);

        if ($total <= 0) {
            return 0.0;
        }

        $weighted = 0.0;
        foreach ($availableByZone as $code => $ha) {
            $weighted += $ha * ($compatibility[$code] ?? 0.0);
        }

        return $weighted / $total;
    }

    public function calculateAll(string $analysisType, ?string $useSubtype = null): Collection
    {
        $zones = ZoneUnit::with(['hazardData', 'soilData', 'zoningData'])->get();
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

        // Checked in this exact order — first match wins. Reforestation goes first so
        // "plant trees" is not read as an industrial "plant"; keywords match whole words
        // (plurals allowed) so "restore" is not "store" and "report" is not "port".
        $keywords = [
            'reforestation' => ['tree', 'reforest', 'reforestation', 'forest', 'mangrove', 'native species',
                'seedling', 'nursery', 'watershed', 'planting', 'plant trees', 'greening'],
            'commercial' => ['grocery', 'store', 'mall', 'market', 'shop', 'retail',
                'restaurant', 'cafe', 'bakery', 'pharmacy', 'clinic',
                'hospital', 'school', 'hotel', 'gasoline', 'hardware'],
            'residential' => ['house', 'subdivision', 'condo', 'housing',
                'residential', 'apartment', 'home', 'dwelling'],
            'industrial' => ['factory', 'warehouse', 'plant', 'industrial',
                'manufacturing', 'storage', 'logistics', 'port'],
            'agricultural' => ['farm', 'crop', 'rice', 'banana', 'coconut',
                'agricultural', 'plantation', 'irrigation', 'harvest'],
        ];

        foreach ($keywords as $type => $words) {
            foreach ($words as $kw) {
                if (preg_match('/\b'.preg_quote($kw, '/').'(s|es)?\b/', $q)) {
                    return $type;
                }
            }
        }

        return 'commercial';
    }

    private function classify(float $score): string
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
