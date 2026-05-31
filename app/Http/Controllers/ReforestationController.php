<?php

namespace App\Http\Controllers;

use App\Models\ZoneUnit;
use App\Services\ReforestationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ReforestationController extends Controller
{
    public function __construct(private ReforestationService $service) {}

    public function index(): JsonResponse
    {
        $zones = ZoneUnit::select([
            'zone_unit_id',
            'unit_name',
            'unit_type',
            'total_area_ha',
            'settlement_tier',
            'dominant_soil_type',
            'dominant_slope_class',
            'land_capability_class',
            'elevation_min',
            'elevation_max',
            'salinity_level',
        ])->orderBy('unit_name')->get();

        return response()->json(['zones' => $zones]);
    }

    public function getMatches(int $id): JsonResponse
    {
        $zone = ZoneUnit::findOrFail($id);

        $species      = $this->service->matchSpecies($zone);
        $restrictions = $this->service->checkRestrictions($zone);

        return response()->json([
            'zone'         => $zone->only([
                'zone_unit_id', 'unit_name', 'unit_type', 'total_area_ha',
                'settlement_tier', 'dominant_soil_type', 'dominant_slope_class',
                'land_capability_class', 'elevation_min', 'elevation_max', 'salinity_level',
            ]),
            'species'      => $species,
            'restrictions' => $restrictions,
        ]);
    }

    public function report(int $id): JsonResponse
    {
        $zone = ZoneUnit::with(['hazardData', 'soilData'])->findOrFail($id);

        $species      = $this->service->matchSpecies($zone);
        $restrictions = $this->service->checkRestrictions($zone);
        $topSpecies   = array_slice($species, 0, 3);

        return response()->json([
            'report_type'  => 'Reforestation Plan',
            'generated_at' => now()->toDateTimeString(),
            'zone'         => $zone->only([
                'zone_unit_id', 'unit_name', 'unit_type', 'total_area_ha',
                'settlement_tier', 'dominant_soil_type', 'dominant_slope_class',
                'land_capability_class', 'elevation_min', 'elevation_max', 'salinity_level',
            ]),
            'summary' => [
                'total_species_matched' => count($species),
                'top_recommended_count' => count($topSpecies),
                'restriction_count'     => $restrictions->count(),
                'avg_score_pct'         => count($species) > 0
                    ? (int) round(array_sum(array_column($species, 'score_pct')) / count($species))
                    : 0,
            ],
            'top_species'  => $topSpecies,
            'all_species'  => $species,
            'restrictions' => $restrictions,
        ]);
    }

    public function pdf(int $id): Response
    {
        $zone = ZoneUnit::with(['hazardData', 'soilData'])->findOrFail($id);

        $species      = $this->service->matchSpecies($zone);
        $restrictions = $this->service->checkRestrictions($zone);
        $topSpecies   = array_slice($species, 0, 3);

        $data = [
            'zone'         => $zone->only([
                'zone_unit_id', 'unit_name', 'unit_type', 'total_area_ha',
                'settlement_tier', 'dominant_soil_type', 'dominant_slope_class',
                'land_capability_class', 'elevation_min', 'elevation_max', 'salinity_level',
            ]),
            'summary' => [
                'total_species_matched' => count($species),
                'top_recommended_count' => count($topSpecies),
                'restriction_count'     => $restrictions->count(),
                'avg_score_pct'         => count($species) > 0
                    ? (int) round(array_sum(array_column($species, 'score_pct')) / count($species))
                    : 0,
            ],
            'allSpecies'   => $species,
            'restrictions' => $restrictions->toArray(),
            'generatedAt'  => now()->format('F j, Y · g:i A'),
        ];

        $pdf = Pdf::loadView('pdf.reforestation-plan', $data)
            ->setPaper('a4', 'portrait');

        $filename = 'reforestation-plan-' . str($zone->unit_name)->slug() . '-' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }
}
