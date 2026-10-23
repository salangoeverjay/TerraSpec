<?php

namespace App\Http\Controllers;

use App\Models\ZoneUnit;
use App\Services\MangroveRecommendationService;
use App\Services\ReforestationService;
use App\Services\ReforestationSiteValidationService;
use App\Services\ReforestationStudyArea;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ReforestationController extends Controller
{
    public function __construct(
        private ReforestationService $service,
        private ReforestationStudyArea $studyArea,
        private MangroveRecommendationService $mangroves,
    ) {}

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
        ])->whereIn('zone_unit_id', $this->studyArea->zoneIds())->orderBy('unit_name')->get();

        return response()->json([
            'zones' => $zones,
            'study_area' => ['barangays' => $this->studyArea->names(), 'note' => $this->studyArea->description()],
        ]);
    }

    // GET /reforestation/sites
    public function sites(ReforestationSiteValidationService $validation): JsonResponse
    {
        return response()->json(['data' => $validation->validate()]);
    }

    // GET /reforestation/{id}/match: mangrove species (true mangroves and associates only) by tidal zone
    public function getMatches(int $id): JsonResponse
    {
        $zone = $this->studyAreaZone($id);

        return response()->json([
            'zone' => $this->zoneInfo($zone),
            'mangrove' => $this->mangroves->forZone($zone),
            'restrictions' => $this->service->checkRestrictions($zone),
        ]);
    }

    public function report(int $id): JsonResponse
    {
        $zone = $this->studyAreaZone($id, ['hazardData', 'soilData']);
        $mangrove = $this->mangroves->forZone($zone);
        $restrictions = $this->service->checkRestrictions($zone);

        return response()->json([
            'report_type' => 'Reforestation Plan',
            'generated_at' => now()->toDateTimeString(),
            'zone' => $this->zoneInfo($zone),
            'summary' => [
                'species_count' => count($mangrove['species']),
                'tidal_zone_count' => count($mangrove['zones']),
                'conservation_priority_count' => count($mangrove['conservation_priority']),
                'restriction_count' => $restrictions->count(),
            ],
            'mangrove' => $mangrove,
            'restrictions' => $restrictions,
        ]);
    }

    public function pdf(int $id): Response
    {
        $zone = $this->studyAreaZone($id, ['hazardData', 'soilData']);
        $mangrove = $this->mangroves->forZone($zone);
        $restrictions = $this->service->checkRestrictions($zone);

        $pdf = Pdf::loadView('pdf.reforestation-plan', [
            'zone' => $this->zoneInfo($zone),
            'mangrove' => $mangrove,
            'sites' => $zone->reforestationSites()->orderBy('id')->get(),
            'restrictions' => $restrictions->toArray(),
            'generatedAt' => now()->format('F j, Y · g:i A'),
        ])->setPaper('a4', 'portrait');

        $filename = 'mangrove-reforestation-plan-'.str($zone->unit_name)->slug().'-'.now()->format('Ymd').'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @return array<string, mixed>
     */
    private function zoneInfo(ZoneUnit $zone): array
    {
        return $zone->only([
            'zone_unit_id', 'unit_name', 'unit_type', 'total_area_ha',
            'settlement_tier', 'dominant_soil_type', 'dominant_slope_class',
            'land_capability_class', 'elevation_min', 'elevation_max', 'salinity_level',
        ]);
    }

    /**
     * A barangay of the reforestation study area; others are refused (their data is not verified).
     *
     * @param  array<int, string>  $with
     */
    private function studyAreaZone(int $id, array $with = []): ZoneUnit
    {
        $zone = ZoneUnit::with($with)->findOrFail($id);

        abort_unless(
            $this->studyArea->contains($zone->zone_unit_id),
            422,
            "{$zone->unit_name} is outside the reforestation study area. ".$this->studyArea->description(),
        );

        return $zone;
    }
}
