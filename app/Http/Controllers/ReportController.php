<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerateReportRequest;
use App\Models\Report;
use App\Models\ZoneUnit;
use App\Services\GeminiChatService;
use App\Services\MangroveRecommendationService;
use App\Services\ReforestationStudyArea;
use App\Services\SuitabilityScoreService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    public function __construct(
        private SuitabilityScoreService $scorer,
        private GeminiChatService $gemini,
        private ReforestationStudyArea $studyArea,
        private MangroveRecommendationService $mangroves,
    ) {}

    // POST /api/reports/generate (CPDO staff only, 10 per minute)
    public function generate(GenerateReportRequest $request): Response
    {
        $type = $request->validated('type');
        $isComparative = $type === 'Comparative Analysis';
        $barangay = $isComparative ? '' : $request->validated('barangay');
        $sections = $request->validated('sections') ?? [];
        // Land use for the scores and rankings (commercial when not chosen)
        $landUse = $request->validated('land_use') ?? 'commercial';

        // Resolve zone unit (all types except Comparative need one)
        $zone = null;
        if (! $isComparative && $barangay) {
            $zone = ZoneUnit::where('unit_name', $barangay)
                ->with(['hazardData', 'soilData', 'restrictions'])
                ->first();
        }

        $data = [
            'report_type' => $type,
            'barangay' => $barangay,
            'sections' => $sections,
            'generated_at' => now()->format('F j, Y · g:i A'),
            'report_id' => 'RPT-'.strtoupper(substr(md5($type.$barangay.now()->timestamp), 0, 8)),
            'zone' => $zone,
            'hazard' => $zone?->hazardData,
            'soil' => $zone?->soilData,
            'restrictions' => $zone?->restrictions ?? collect(),
        ];

        // Reforestation is only assessed in the study area (barangays with verified sites)
        abort_if(
            $zone && $type !== 'Reforestation Plan' && ! $this->studyArea->includes($landUse, $zone->zone_unit_id),
            422,
            "{$zone?->unit_name} is outside the reforestation study area. ".$this->studyArea->description(),
        );

        $scoredTypes = ['Suitability Summary', 'Zone Compliance Check', 'Environmental Clearance', 'Hazard Assessment'];

        if ($zone && in_array($type, $scoredTypes, true)) {
            $analysisType = $landUse;
            $result = $this->scorer->calculate($zone, $analysisType);
            $data['scores'] = $result['scores'];
            $data['total_score'] = $result['total_score'];
            $data['total_pct'] = $result['total_pct'];
            $data['suitability_level'] = $result['suitability_level'];
            $data['criteria_breakdown'] = $result['criteria_breakdown'];
            $data['applied_weights'] = $result['applied_weights'];
            $data['analysis_type'] = $analysisType;
        }

        // Reforestation plans only for barangays with verified reforestation or mangrove sites
        if ($type === 'Reforestation Plan') {
            abort_unless(
                $zone && $this->studyArea->contains($zone->zone_unit_id),
                422,
                'Reforestation plans are only available for the reforestation study area. '.$this->studyArea->description(),
            );
        }

        if ($type === 'Reforestation Plan' && $zone) {
            $mangrove = $this->mangroves->forZone($zone);
            $data['mangrove'] = $mangrove;
            $data['species'] = $mangrove['species'];
        }

        if ($isComparative) {
            $all = $this->scorer->calculateAll($landUse);
            $data['analysis_type'] = $landUse;
            $data['ranking_scope'] = $this->studyArea->appliesTo($landUse) ? $this->studyArea->description() : 'All 40 barangays';
            $data['rankings'] = $all->map(fn ($r) => [
                'unit_name' => $r['zone']->unit_name,
                'unit_type' => $r['zone']->unit_type,
                'total_pct' => $r['total_pct'],
                'suitability_level' => $r['suitability_level'],
                'rank' => $r['rank'],
            ])->values();
        }

        // AI-generated narrative — gracefully falls back to '' on failure
        $data['ai_narrative'] = $this->gemini->generateNarrative($data);

        // Save report record to DB
        Report::create([
            'report_type' => $type,
            'analysis_type' => $type === 'Reforestation Plan' ? 'reforestation' : $landUse,
            'barangay' => $barangay ?: null,
            'zone_unit_id' => $zone?->zone_unit_id,
            'generated_by' => $request->user()?->id,
            'status' => 'Final',
            'sections' => $sections,
        ]);

        $pdf = Pdf::loadView('pdf.report', $data)->setPaper('a4', 'portrait');

        $slug = Str::slug($type).'-'.Str::slug($barangay ?: 'all').'-'.now()->format('Ymd');

        return $pdf->download("{$slug}.pdf");
    }

    // GET /api/reports: report archive for signed-in CPDO staff (admin and planner)
    public function archive(): JsonResponse
    {
        $reports = Report::with(['generatedBy'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'report_type' => $r->report_type,
                'analysis_type' => $r->analysis_type,
                'barangay' => $r->barangay ?? 'All Barangays',
                'status' => $r->status,
                'generated_by' => $r->generatedBy?->name ?? 'CPDO',
                'created_at' => $r->created_at->format('Y-m-d'),
            ]);

        return response()->json($reports);
    }
}
