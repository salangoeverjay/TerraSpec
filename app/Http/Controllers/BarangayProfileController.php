<?php

namespace App\Http\Controllers;

use App\Models\ZoneUnit;
use App\Services\ReforestationStudyArea;
use App\Services\SuitabilityScoreService;
use Illuminate\Http\JsonResponse;

/**
 * Zoning and hazard profile of each barangay (zone unit): CLUP hazard tables, zoning class
 * areas from the Integrated Zoning Map, restrictions and suitability per land use.
 */
class BarangayProfileController extends Controller
{
    private const ANALYSIS_TYPES = ['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'];

    public function __construct(
        private SuitabilityScoreService $scorer,
        private ReforestationStudyArea $studyArea,
    ) {}

    // GET /barangays
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => ZoneUnit::orderBy('unit_name')
                ->get(['zone_unit_id', 'unit_name', 'unit_type', 'settlement_tier', 'total_area_ha'])
                ->map(fn (ZoneUnit $z) => [
                    'zone_unit_id' => $z->zone_unit_id,
                    'unit_name' => $z->unit_name,
                    'unit_type' => $z->unit_type,
                    'settlement_tier' => $z->settlement_tier,
                    'total_area_ha' => (float) $z->total_area_ha,
                ]),
        ]);
    }

    // GET /barangays/{id}/profile
    public function show(int $id): JsonResponse
    {
        $zone = ZoneUnit::with(['hazardData', 'soilData', 'zoningData', 'restrictions', 'reforestationSites'])->findOrFail($id);
        $hazard = $zone->hazardData;
        $labels = config('suitability.constraint_labels', []);

        $zoningRows = $zone->zoningData->where('zoning_code', '!=', 'NONE');
        $zonedArea = (float) $zoningRows->sum('area_ha');

        $suitability = [];
        foreach (self::ANALYSIS_TYPES as $type) {
            // Reforestation is assessed only in the study area (barangays with verified sites)
            if (! $this->studyArea->includes($type, $zone->zone_unit_id)) {
                $suitability[$type] = ['outside_study_area' => true, 'note' => $this->studyArea->description()];

                continue;
            }

            $result = $this->scorer->calculate($zone, $type);
            $suitability[$type] = [
                'pct' => $result['total_pct'],
                'level' => $result['suitability_level'],
                'excluded' => $result['constraint']['excluded'] ?? false,
                'available_area_ha' => $result['constraint']['available_area_ha'] ?? null,
                'main_constraint' => array_key_first($result['constraint']['reasons'] ?? []) ?? null,
            ];
        }

        return response()->json([
            'data' => [
                'zone_unit_id' => $zone->zone_unit_id,
                'unit_name' => $zone->unit_name,
                'overview' => [
                    'unit_type' => $zone->unit_type,
                    'settlement_tier' => $zone->settlement_tier,
                    'total_area_ha' => (float) $zone->total_area_ha,
                    'population_2020' => $zone->population_2020,
                    'household_count' => $zone->household_count,
                    'dominant_soil_type' => $zone->dominant_soil_type,
                    'dominant_slope_class' => $zone->dominant_slope_class,
                    'land_capability_class' => $zone->land_capability_class,
                ],
                'zoning' => [
                    'source' => 'Integrated Zoning Map C.Y. 2020-2029 (digitized) within PSA 2023 barangay boundary',
                    'zoned_area_ha' => round($zonedArea, 2),
                    'unzoned_area_ha' => round((float) $zone->zoningData->where('zoning_code', 'NONE')->sum('area_ha'), 2),
                    'classes' => $zoningRows->sortByDesc('area_ha')->values()->map(fn ($row) => [
                        'code' => $row->zoning_code,
                        'label' => $labels[$row->zoning_code] ?? $row->zoning_code,
                        'area_ha' => (float) $row->area_ha,
                        'share' => $zonedArea > 0 ? round((float) $row->area_ha / $zonedArea, 4) : 0,
                        'flood_very_high_ha' => (float) $row->flood_very_high_ha,
                        'landslide_high_ha' => (float) $row->landslide_high_ha,
                    ]),
                    'mapped_flood_very_high_ha' => round((float) $zone->zoningData->sum('flood_very_high_ha'), 2),
                    'mapped_landslide_high_ha' => round((float) $zone->zoningData->sum('landslide_high_ha'), 2),
                ],
                'hazards' => $hazard ? [
                    'flood' => $this->classes('CLUP Table PF-19 (DENR-MGB XI, 2020)', [
                        'High' => $hazard->flood_high_ha,
                        'Moderate' => $hazard->flood_moderate_ha,
                        'Low' => $hazard->flood_low_ha,
                        'None' => $hazard->flood_none_ha,
                    ]),
                    'liquefaction' => $this->classes('CLUP Table PF-26 (MGB-XI and CDRRMO, 2020)', [
                        'High (HSA)' => $hazard->liquefaction_hsa_ha,
                        'Moderate (MSA)' => $hazard->liquefaction_msa_ha,
                        'Low (LSA)' => $hazard->liquefaction_lsa_ha,
                        'None' => $hazard->liquefaction_none_ha,
                    ]),
                    'storm_surge' => $this->classes('CLUP Table PF-24', [
                        'High' => $hazard->storm_surge_high_ha,
                        'Moderate' => $hazard->storm_surge_moderate_ha,
                        'Low' => $hazard->storm_surge_low_ha,
                    ]),
                    'flags' => [
                        'flood' => $hazard->has_flood,
                        'landslide' => $hazard->has_landslide,
                        'storm_surge' => $hazard->has_storm_surge,
                        'drought' => $hazard->has_drought,
                        'sea_level_rise' => $hazard->has_sea_level_rise,
                    ],
                ] : null,
                'soil' => $zone->soilData ? collect([
                    'Cabangan Clay Loam' => $zone->soilData->cabangan_clay_loam_ha,
                    'Camasan Sandy Clay Loam' => $zone->soilData->camasan_sandy_clay_loam_ha,
                    'Matina Clay Loam' => $zone->soilData->matina_clay_loam_ha,
                    'San Manuel Silty Clay Loam' => $zone->soilData->san_manuel_silty_clay_loam_ha,
                ])->map(fn ($ha, $name) => ['soil' => $name, 'area_ha' => (float) $ha])->filter(fn ($s) => $s['area_ha'] > 0)->values() : [],
                'restrictions' => $zone->restrictions->map(fn ($r) => [
                    'name' => $r->restriction_name,
                    'type' => $r->restriction_type,
                    'description' => $r->description,
                ])->values(),
                'suitability' => $suitability,
                'reforestation_sites' => $zone->reforestationSites->sortBy('id')->values()->map(fn ($site) => [
                    'name' => $site->name,
                    'status' => $site->status,
                    'year' => $site->year,
                    'adopter' => $site->adopter,
                    'area_ha' => $site->area_ha,
                    'mangrove_zone_share' => $site->mangrove_zone_share,
                ]),
            ],
        ]);
    }

    /**
     * Hazard classes in hectares with their share of the table's own total for this barangay.
     *
     * @param  array<string, mixed>  $classes
     * @return array{source: string, total_ha: float, classes: array<int, array{label: string, area_ha: float, share: float}>}
     */
    private function classes(string $source, array $classes): array
    {
        $total = array_sum(array_map('floatval', $classes));

        return [
            'source' => $source,
            'total_ha' => round($total, 2),
            'classes' => collect($classes)->map(fn ($ha, $label) => [
                'label' => $label,
                'area_ha' => (float) $ha,
                'share' => $total > 0 ? round((float) $ha / $total, 4) : 0,
            ])->values()->all(),
        ];
    }
}
