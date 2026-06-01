<?php

namespace App\Http\Controllers;

use App\Models\ZoneUnit;
use App\Models\SuitabilityCriteria;
use App\Services\GeminiChatService;
use App\Services\SuitabilityScoreService;
use App\Services\ReforestationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    public function __construct(
        private SuitabilityScoreService $scorer,
        private ReforestationService    $reforestation,
        private GeminiChatService       $gemini,
    ) {}

    public function generate(Request $request): Response
    {
        $type     = $request->input('type', 'Suitability Summary');
        $barangay = $request->input('barangay', '');
        $sections = $request->input('sections', []);

        $isComparative = $type === 'Comparative Analysis';

        // Resolve zone unit (all types except Comparative need one)
        $zone = null;
        if (!$isComparative && $barangay) {
            $zone = ZoneUnit::where('unit_name', $barangay)
                ->with(['hazardData', 'soilData', 'restrictions'])
                ->first();
        }

        $data = [
            'report_type'  => $type,
            'barangay'     => $barangay,
            'sections'     => $sections,
            'generated_at' => now()->format('F j, Y · g:i A'),
            'report_id'    => 'RPT-' . strtoupper(substr(md5($type . $barangay . now()->timestamp), 0, 8)),
            'zone'         => $zone,
            'hazard'       => $zone?->hazardData,
            'soil'         => $zone?->soilData,
            'restrictions' => $zone?->restrictions ?? collect(),
        ];

        // Type-specific data
        $analysisTypeMap = [
            'Suitability Summary'    => 'commercial',
            'Zone Compliance Check'  => 'commercial',
            'Environmental Clearance'=> 'commercial',
            'Hazard Assessment'      => 'commercial',
        ];

        if ($zone && in_array($type, array_keys($analysisTypeMap))) {
            $analysisType    = $analysisTypeMap[$type];
            $result          = $this->scorer->calculate($zone, $analysisType);
            $data['scores']  = $result['scores'];
            $data['total_score']       = $result['total_score'];
            $data['total_pct']         = $result['total_pct'];
            $data['suitability_level'] = $result['suitability_level'];
            $data['criteria_breakdown']= $result['criteria_breakdown'];
            $data['applied_weights']   = $result['applied_weights'];
            $data['analysis_type']     = $analysisType;
        }

        if ($type === 'Reforestation Plan' && $zone) {
            $species             = $this->reforestation->matchSpecies($zone);
            $data['species']     = $species;
            $data['top_species'] = array_slice($species, 0, 3);
        }

        if ($isComparative) {
            $all    = $this->scorer->calculateAll('commercial');
            $data['rankings'] = $all->map(fn ($r) => [
                'unit_name'        => $r['zone']->unit_name,
                'unit_type'        => $r['zone']->unit_type,
                'total_pct'        => $r['total_pct'],
                'suitability_level'=> $r['suitability_level'],
                'rank'             => $r['rank'],
            ])->values();
        }

        // AI-generated narrative — gracefully falls back to '' on failure
        $data['ai_narrative'] = $this->gemini->generateNarrative($data);

        $pdf = Pdf::loadView('pdf.report', $data)->setPaper('a4', 'portrait');

        $slug = Str::slug($type) . '-' . Str::slug($barangay ?: 'all') . '-' . now()->format('Ymd');
        return $pdf->download("{$slug}.pdf");
    }
}
