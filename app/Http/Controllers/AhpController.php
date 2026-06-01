<?php

namespace App\Http\Controllers;

use App\Models\SuitabilityCriteria;
use App\Services\AhpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AhpController extends Controller
{
    public function __construct(private AhpService $ahp) {}

    /**
     * POST /api/admin/ahp/compute
     * Accepts a full n×n pairwise comparison matrix.
     * Returns weights, λmax, CI, CR — does NOT save to DB.
     */
    public function compute(Request $request): JsonResponse
    {
        $request->validate([
            'matrix'       => 'required|array|min:2',
            'matrix.*'     => 'required|array',
            'matrix.*.*'   => 'required|numeric|min:0.0001|max:9',
        ]);

        try {
            $result = $this->ahp->compute($request->input('matrix'));
            return response()->json($result);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/admin/ahp/apply
     * Accepts analysis_type + full n×n matrix.
     * Validates CR ≤ 0.10, then saves derived weights to suitability_criteria.
     */
    public function apply(Request $request): JsonResponse
    {
        $request->validate([
            'analysis_type' => 'required|in:commercial,residential,industrial,agricultural,reforestation',
            'matrix'        => 'required|array|min:2',
            'matrix.*'      => 'required|array',
            'matrix.*.*'    => 'required|numeric|min:0.0001|max:9',
        ]);

        try {
            $result = $this->ahp->compute($request->input('matrix'));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        if (! $result['valid']) {
            return response()->json([
                'error'  => "Consistency Ratio {$result['cr_pct']}% exceeds 10%. Adjust the pairwise comparisons until CR ≤ 10%.",
                'cr'     => $result['cr'],
                'cr_pct' => $result['cr_pct'],
                'valid'  => false,
            ], 422);
        }

        $type     = $request->input('analysis_type');
        $typeKey  = "{$type}_weight";
        $criteria = SuitabilityCriteria::orderBy('criteria_id')->get();

        foreach ($criteria as $idx => $criterion) {
            if (isset($result['weights'][$idx])) {
                $criterion->update([$typeKey => round($result['weights'][$idx], 6)]);
            }
        }

        // Also update the default_weight if this is the first/only type run
        // (optional — keeps default in sync with commercial as the primary type)
        if ($type === 'commercial') {
            foreach ($criteria as $idx => $criterion) {
                if (isset($result['weights'][$idx])) {
                    $criterion->update(['default_weight' => round($result['weights'][$idx], 6)]);
                }
            }
        }

        return response()->json([
            'message'       => "AHP weights applied to {$type} analysis.",
            'analysis_type' => $type,
            'criteria_count'=> $criteria->count(),
            'weights'       => $result['weights'],
            'lambda_max'    => $result['lambda_max'],
            'ci'            => $result['ci'],
            'cr'            => $result['cr'],
            'cr_pct'        => $result['cr_pct'],
        ]);
    }
}
