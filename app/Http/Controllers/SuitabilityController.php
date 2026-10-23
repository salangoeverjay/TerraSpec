<?php

namespace App\Http\Controllers;

use App\Models\SuitabilityAnalysis;
use App\Models\ZoneUnit;
use App\Services\ReforestationStudyArea;
use App\Services\SuitabilityComparisonService;
use App\Services\SuitabilityScoreService;
use App\Services\SuitabilitySensitivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuitabilityController extends Controller
{
    public function __construct(
        private SuitabilityScoreService $scorer,
        private ReforestationStudyArea $studyArea,
    ) {}

    // GET /suitability/compare?analysis_type=residential
    // Runs AHP-WLC, AHP-TOPSIS, EWM-WLC and EWM-TOPSIS on the same data (not persisted).
    public function compare(Request $request, SuitabilityComparisonService $comparison): JsonResponse
    {
        $validated = $request->validate([
            'analysis_type' => 'required|in:commercial,residential,industrial,agricultural,reforestation',
        ]);

        return response()->json([
            'data' => $comparison->compare($validated['analysis_type']),
            'methods' => SuitabilityComparisonService::METHODS,
            'study_area' => $this->studyAreaNote($validated['analysis_type']),
        ]);
    }

    // GET /suitability/sensitivity?analysis_type=residential
    // One-at-a-time ±10/20% weight sensitivity of AHP-WLC (not persisted).
    public function sensitivity(Request $request, SuitabilitySensitivityService $sensitivity): JsonResponse
    {
        $validated = $request->validate([
            'analysis_type' => 'required|in:commercial,residential,industrial,agricultural,reforestation',
        ]);

        return response()->json([
            'data' => $sensitivity->analyze($validated['analysis_type']),
            'study_area' => $this->studyAreaNote($validated['analysis_type']),
        ]);
    }

    // GET /suitability/breakdown?analysis_type=residential&zone_unit_id=3
    // How one barangay's AHP-WLC score is built: criterion score × weight per criterion,
    // plus the constraint step (computed live, not persisted).
    public function breakdown(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'analysis_type' => 'required|in:commercial,residential,industrial,agricultural,reforestation',
            'zone_unit_id' => 'required|integer|exists:zone_units,zone_unit_id',
        ]);

        $zone = ZoneUnit::findOrFail($validated['zone_unit_id']);

        if (! $this->studyArea->includes($validated['analysis_type'], $zone->zone_unit_id)) {
            return $this->outsideStudyArea($zone);
        }

        $result = $this->scorer->calculate($zone, $validated['analysis_type']);

        return response()->json([
            'data' => [
                'zone_unit_id' => $zone->zone_unit_id,
                'unit_name' => $zone->unit_name,
                'analysis_type' => $result['analysis_type'],
                'criteria' => collect($result['criteria_breakdown'])
                    ->map(fn (array $c, string $name) => ['criterion' => $name, ...$c])
                    ->values(),
                'weighted_sum' => round(collect($result['criteria_breakdown'])->sum('weighted'), 4),
                'total_score' => $result['total_score'],
                'total_pct' => $result['total_pct'],
                'suitability_level' => $result['suitability_level'],
                'constraint' => $result['constraint'],
            ],
        ]);
    }

    // GET /suitability/summary
    // Latest stored AHP-WLC result of every zone unit for every analysis type (for map popups,
    // chat context and the landing page).
    public function summary(): JsonResponse
    {
        $latestIds = SuitabilityAnalysis::query()
            ->selectRaw('MAX(analysis_id) as analysis_id')
            ->groupBy('zone_unit_id', 'analysis_type')
            ->pluck('analysis_id');

        $analyses = SuitabilityAnalysis::query()
            ->whereIn('analysis_id', $latestIds)
            ->get()
            ->groupBy('analysis_type')
            ->map(fn ($rows) => $rows->sortByDesc('total_score')->values()->map(fn ($a, $i) => [
                'zone_unit_id' => $a->zone_unit_id,
                'pct' => round($a->total_score * 100, 1),
                'level' => $a->suitability_level,
                'rank' => $i + 1,
            ]));

        $zones = ZoneUnit::orderBy('unit_name')->get()->map(function (ZoneUnit $zone) use ($analyses) {
            $scores = [];
            foreach ($analyses as $type => $rows) {
                if (! $this->studyArea->includes($type, $zone->zone_unit_id)) {
                    continue;
                }
                $row = $rows->firstWhere('zone_unit_id', $zone->zone_unit_id);
                if ($row) {
                    $scores[$type] = ['pct' => $row['pct'], 'level' => $row['level'], 'rank' => $row['rank']];
                }
            }

            return [
                'zone_unit_id' => $zone->zone_unit_id,
                'unit_name' => $zone->unit_name,
                'unit_type' => $zone->unit_type,
                'scores' => $scores,
            ];
        });

        return response()->json(['data' => $zones]);
    }

    // GET /suitability/rankings?analysis_type=commercial
    public function rankings(Request $request): JsonResponse
    {
        $type = $request->input('analysis_type', 'commercial');

        // Latest stored result per barangay: repeated "Calculate" runs add rows and must not appear twice
        $latestIds = SuitabilityAnalysis::query()
            ->where('analysis_type', $type)
            ->selectRaw('MAX(analysis_id) as analysis_id')
            ->groupBy('zone_unit_id')
            ->pluck('analysis_id');

        $rows = SuitabilityAnalysis::with('zoneUnit')
            ->whereIn('analysis_id', $latestIds)
            ->where('analysis_type', $type)
            ->when($this->studyArea->appliesTo($type), fn ($query) => $query->whereIn('zone_unit_id', $this->studyArea->zoneIds()))
            ->orderByDesc('total_score')
            ->get()
            ->values()
            ->map(fn ($a, $i) => [
                'rank' => $i + 1,
                'analysis_id' => $a->analysis_id,
                'zone_unit_id' => $a->zone_unit_id,
                'unit_name' => $a->zoneUnit->unit_name,
                'unit_type' => $a->zoneUnit->unit_type,
                'settlement_tier' => $a->zoneUnit->settlement_tier,
                'population_density' => $a->zoneUnit->population_density,
                'total_score' => $a->total_score,
                'total_pct' => round($a->total_score * 100, 1),
                'suitability_level' => $a->suitability_level,
                'flood_score' => $a->flood_score,
                'slope_score' => $a->slope_score,
                'soil_score' => $a->soil_score,
                'liquefaction_score' => $a->liquefaction_score,
                'population_score' => $a->population_score,
                'saturation_score' => $a->saturation_score,
                'applied_weights' => $a->applied_weights,
            ]);

        $avg = $rows->avg('total_score');

        return response()->json([
            'analysis_type' => $type,
            'count' => $rows->count(),
            'avg_score' => round($avg * 100, 1),
            'study_area' => $this->studyAreaNote($type),
            'data' => $rows,
        ]);
    }

    // GET /suitability — all zone units with their latest analysis score
    public function index(): JsonResponse
    {
        $zones = ZoneUnit::with(['hazardData', 'soilData', 'latestAnalysis'])
            ->orderBy('unit_name')
            ->get()
            ->map(fn ($z) => [
                'zone_unit_id' => $z->zone_unit_id,
                'unit_name' => $z->unit_name,
                'unit_type' => $z->unit_type,
                'settlement_tier' => $z->settlement_tier,
                'total_area_ha' => $z->total_area_ha,
                'population_2020' => $z->population_2020,
                'population_density' => $z->population_density,
                'saturation_index' => $z->saturation_index,
                'dominant_soil_type' => $z->dominant_soil_type,
                'dominant_slope_class' => $z->dominant_slope_class,
                'land_capability_class' => $z->land_capability_class,
                'latest_analysis' => $z->latestAnalysis ? [
                    'analysis_type' => $z->latestAnalysis->analysis_type,
                    'total_score' => $z->latestAnalysis->total_score,
                    'suitability_level' => $z->latestAnalysis->suitability_level,
                    'date_created' => $z->latestAnalysis->date_created,
                ] : null,
            ]);

        return response()->json(['data' => $zones]);
    }

    // POST /suitability/calculate
    // Body: { analysis_type, zone_unit_id? (null = all zones) }
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'analysis_type' => 'required|in:commercial,residential,industrial,agricultural,reforestation',
            'zone_unit_id' => 'nullable|integer|exists:zone_units,zone_unit_id',
            'use_subtype' => 'nullable|string|max:100',
        ]);

        $type = $validated['analysis_type'];
        $subtype = $validated['use_subtype'] ?? null;
        $userId = $request->user()?->id;

        if (! empty($validated['zone_unit_id'])) {
            $zone = ZoneUnit::with(['hazardData', 'soilData'])->findOrFail($validated['zone_unit_id']);

            if (! $this->studyArea->includes($type, $zone->zone_unit_id)) {
                return $this->outsideStudyArea($zone);
            }

            $result = $this->scorer->calculate($zone, $type, $subtype);
            $saved = $this->persistAnalysis($result, $userId);

            return response()->json([
                'data' => $this->formatResult($result, $saved->analysis_id),
                'message' => 'Analysis complete.',
            ]);
        }

        // All zones
        $results = $this->scorer->calculateAll($type, $subtype);
        $saved = $results->map(fn ($r) => $this->persistAnalysis($r, $userId));

        return response()->json([
            'data' => $results->map(fn ($r, $i) => $this->formatResult($r, $saved[$i]->analysis_id)),
            'count' => $results->count(),
            'message' => "Analysis complete for all {$results->count()} zone units.",
        ]);
    }

    // POST /suitability/nlp
    // Body: { query: "best place for a grocery store" }
    public function fromNlp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => 'required|string|max:500',
        ]);

        $query = $validated['query'];
        $type = $this->scorer->detectAnalysisType($query);
        $useSubtype = $this->extractSubtype($query);
        $userId = $request->user()?->id;

        $allResults = $this->scorer->calculateAll($type, $useSubtype);
        $top5 = $allResults->take(5);

        $savedIds = $top5->map(fn ($r) => $this->persistAnalysis($r, $userId)->analysis_id);

        $response = $top5->map(function ($result, $index) use ($useSubtype, $savedIds) {
            return [
                ...$this->formatResult($result, $savedIds[$index]),
                'explanation' => $this->buildExplanation($result, $useSubtype ?? $result['analysis_type']),
            ];
        });

        return response()->json([
            'query' => $query,
            'detected_type' => $type,
            'use_subtype' => $useSubtype,
            'top_results' => $response,
        ]);
    }

    // GET /suitability/{id}
    public function show(int $id): JsonResponse
    {
        $analysis = SuitabilityAnalysis::with('zoneUnit')->findOrFail($id);

        return response()->json([
            'data' => [
                'analysis_id' => $analysis->analysis_id,
                'zone' => [
                    'zone_unit_id' => $analysis->zoneUnit->zone_unit_id,
                    'unit_name' => $analysis->zoneUnit->unit_name,
                    'unit_type' => $analysis->zoneUnit->unit_type,
                ],
                'analysis_type' => $analysis->analysis_type,
                'use_subtype' => $analysis->use_subtype,
                'flood_score' => $analysis->flood_score,
                'slope_score' => $analysis->slope_score,
                'soil_score' => $analysis->soil_score,
                'population_score' => $analysis->population_score,
                'saturation_score' => $analysis->saturation_score,
                'liquefaction_score' => $analysis->liquefaction_score,
                'total_score' => $analysis->total_score,
                'total_pct' => round($analysis->total_score * 100, 1),
                'suitability_level' => $analysis->suitability_level,
                'criteria_breakdown' => $analysis->criteria_breakdown,
                'applied_weights' => $analysis->applied_weights,
                'date_created' => $analysis->date_created,
            ],
        ]);
    }

    private function persistAnalysis(array $result, ?int $userId): SuitabilityAnalysis
    {
        $zone = $result['zone'];
        $scores = $result['scores'];

        return SuitabilityAnalysis::create([
            'zone_unit_id' => $zone->zone_unit_id,
            'user_id' => $userId,
            'analysis_type' => $result['analysis_type'],
            'use_subtype' => $result['use_subtype'],
            'flood_score' => $scores['flood'],
            'slope_score' => $scores['slope'],
            'soil_score' => $scores['soil'],
            'population_score' => $scores['population'],
            'saturation_score' => $scores['saturation'],
            'liquefaction_score' => $scores['liquefaction'],
            'total_score' => $result['total_score'],
            'suitability_level' => $result['suitability_level'],
            'criteria_breakdown' => $result['criteria_breakdown'],
            'applied_weights' => $result['applied_weights'],
        ]);
    }

    private function formatResult(array $result, int $analysisId): array
    {
        $zone = $result['zone'];

        return [
            'analysis_id' => $analysisId,
            'rank' => $result['rank'] ?? null,
            'zone_unit_id' => $zone->zone_unit_id,
            'unit_name' => $zone->unit_name,
            'unit_type' => $zone->unit_type,
            'settlement_tier' => $zone->settlement_tier,
            'analysis_type' => $result['analysis_type'],
            'use_subtype' => $result['use_subtype'],
            'scores' => $result['scores'],
            'total_score' => $result['total_score'],
            'total_pct' => $result['total_pct'],
            'suitability_level' => $result['suitability_level'],
            'criteria_breakdown' => $result['criteria_breakdown'],
            'applied_weights' => $result['applied_weights'],
            'constraint' => $result['constraint'] ?? null,
        ];
    }

    private function buildExplanation(array $result, string $useSubtype): string
    {
        $zone = $result['zone'];
        $scores = $result['scores'];
        $pct = $result['total_pct'];
        $level = $result['suitability_level'];

        $explanation = "{$zone->unit_name} scores {$pct}% — {$level}. ";

        // Constraints (CLUP sieve)
        $constraint = $result['constraint'] ?? null;
        if ($constraint !== null && $constraint['excluded']) {
            $main = array_key_first($constraint['reasons']);

            return $explanation.'Excluded by development constraints: only '.round($constraint['available_share'] * 100, 1)."% of its zoned land is available (mainly {$main}).";
        }
        if ($constraint !== null) {
            $explanation .= "About {$constraint['available_area_ha']} ha is free of development constraints. ";
        }

        // Flood
        if ($scores['flood'] >= 0.80) {
            $explanation .= 'Low flood risk. ';
        } elseif ($scores['flood'] < 0.50) {
            $explanation .= 'Warning: significant flood susceptibility. ';
        }

        // Liquefaction
        if ($scores['liquefaction'] < 0.50) {
            $explanation .= 'High liquefaction exposure — structural reinforcement required. ';
        }

        // Population / demand
        if ($scores['population'] >= 0.60) {
            $explanation .= "High population density ({$zone->population_density} p/ha) supports {$useSubtype} demand. ";
        } elseif ($scores['population'] < 0.20) {
            $explanation .= 'Low population density — limited immediate demand. ';
        }

        // Market saturation
        if ($scores['saturation'] >= 0.70) {
            $explanation .= 'Low market saturation — good commercial opportunity. ';
        } elseif ($scores['saturation'] < 0.30) {
            $explanation .= 'High existing commercial density — competitive market. ';
        }

        // Slope
        if ($zone->dominant_slope_class === '0-8') {
            $explanation .= 'Flat terrain, ideal for construction. ';
        } elseif (in_array($zone->dominant_slope_class, ['30-50', '50+'])) {
            $explanation .= 'Steep terrain increases development cost. ';
        }

        // Soil
        if ($scores['soil'] >= 0.85) {
            $explanation .= "Excellent soil ({$zone->dominant_soil_type}). ";
        } elseif ($scores['soil'] < 0.65) {
            $explanation .= "Soil type ({$zone->dominant_soil_type}) may require conditioning. ";
        }

        // Settlement tier
        $explanation .= match ($zone->settlement_tier) {
            'CBD' => 'Located in the central business district.',
            'Minor_Growth' => 'Designated minor growth center.',
            'Emerging' => 'Emerging growth area with development potential.',
            'Satellite' => 'Satellite barangay — infrastructure access may vary.',
            default => '',
        };

        return trim($explanation);
    }

    private function extractSubtype(string $query): ?string
    {
        $subtypes = [
            'grocery', 'supermarket', 'mall', 'hospital', 'clinic', 'school',
            'warehouse', 'factory', 'subdivision', 'condominium', 'resort',
            'restaurant', 'hotel', 'farm', 'plantation', 'nursery',
        ];

        $q = strtolower($query);
        foreach ($subtypes as $sub) {
            if (str_contains($q, $sub)) {
                return $sub;
            }
        }

        return null;
    }

    /**
     * Which barangays a land use is assessed in: all of them, except reforestation (study area only).
     *
     * @return array{barangays: array<int, string>, note: string}|null
     */
    private function studyAreaNote(string $analysisType): ?array
    {
        return $this->studyArea->appliesTo($analysisType)
            ? ['barangays' => $this->studyArea->names(), 'note' => $this->studyArea->description()]
            : null;
    }

    private function outsideStudyArea(ZoneUnit $zone): JsonResponse
    {
        return response()->json([
            'message' => "{$zone->unit_name} is outside the reforestation study area. ".$this->studyArea->description(),
        ], 422);
    }
}
