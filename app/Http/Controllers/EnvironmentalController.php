<?php

namespace App\Http\Controllers;

use App\Models\EnvironmentalRestriction;
use App\Models\ZoneUnit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Environmental overview from verified data: CLUP flood (PF-19) and liquefaction (PF-26) tables, the MGB
 * 2020 landslide map, restrictions built from the Integrated Zoning Map and the mangrove sites, and the
 * CLUP sub-watersheds (Tables PF-4 and PF-5) as information.
 */
class EnvironmentalController extends Controller
{
    /**
     * CLUP Table PF-4 (area) and Table PF-5 (barangays traversed); "Dalisay" in the CLUP is New Malaga.
     *
     * @var array<int, array{name: string, area_ha: float, share_pct: float, barangays: array<int, string>}>
     */
    private const WATERSHEDS = [
        ['name' => 'Tuganay River Watershed', 'area_ha' => 8109.16, 'share_pct' => 32.28, 'barangays' => ['A.O. Floirendo', 'New Malaga', 'Dapco', 'Lower Panaga', 'Manay', 'Nanyo', 'New Malitbog', 'Quezon', 'Sindaton', 'Southern Davao', 'Tibungol']],
        ['name' => 'Lasang River Watershed', 'area_ha' => 6144.50, 'share_pct' => 24.46, 'barangays' => ['Cacao', 'Cagangohan', 'Consolacion', 'New Malaga', 'Datu Abdul Dadia', 'Gredu', 'J.P. Laurel', 'Kasilak', 'Katipunan', 'Kauswagan', 'Little Panay', 'Maduao', 'Manay', 'Nanyo', 'New Malitbog', 'Upper Licanan']],
        ['name' => 'Bunawan River Watershed', 'area_ha' => 7724.92, 'share_pct' => 30.75, 'barangays' => ['Buenavista', 'Cacao', 'Consolacion', 'Katipunan', 'Katualan', 'Kauswagan', 'Kiotoy', 'Mabunao', 'Maduao', 'Malativas', 'San Nicolas', 'San Roque', 'Santa Cruz', 'Tagpore', 'Upper Licanan', 'Waterfall']],
        ['name' => 'Panabo Creek Watershed', 'area_ha' => 3144.42, 'share_pct' => 12.52, 'barangays' => ['Cagangohan', 'Datu Abdul Dadia', 'Gredu', 'J.P. Laurel', 'Nanyo', 'New Pandan', 'New Visayas', 'Quezon', 'Salvacion', 'San Francisco', 'San Pedro', 'San Vicente', 'Southern Davao', 'Santo Nino']],
    ];

    // GET /environmental/summary
    public function summary(): JsonResponse
    {
        return response()->json($this->data());
    }

    // GET /environmental/report
    public function report(): Response
    {
        $data = [
            ...$this->data(),
            'generated_at' => now()->format('F j, Y · g:i A'),
            'report_id' => 'ENV-'.strtoupper(substr(md5((string) now()->timestamp), 0, 8)),
        ];

        return Pdf::loadView('pdf.environmental-report', $data)
            ->setPaper('a4', 'portrait')
            ->download('environmental-assessment-panabo-'.now()->format('Ymd').'.pdf');
    }

    /**
     * @return array<string, mixed>
     */
    private function data(): array
    {
        $zones = ZoneUnit::with('hazardData')->orderBy('unit_name')->get()->filter(fn (ZoneUnit $z) => $z->hazardData);

        // Hazard hectares per barangay from the verified sources
        $hazards = $zones->map(function (ZoneUnit $z) {
            $h = $z->hazardData;
            $floodTotal = (float) ($h->flood_high_ha + $h->flood_moderate_ha + $h->flood_low_ha + $h->flood_none_ha);

            return [
                'zone_unit_id' => $z->zone_unit_id,
                'unit_name' => $z->unit_name,
                'unit_type' => $z->unit_type,
                'flood_high_ha' => round((float) $h->flood_high_ha, 2),
                'flood_any_ha' => round((float) ($h->flood_high_ha + $h->flood_moderate_ha + $h->flood_low_ha), 2),
                'flood_high_share' => $floodTotal > 0 ? round($h->flood_high_ha / $floodTotal, 4) : 0,
                'landslide_high_ha' => round((float) $h->landslide_high_ha, 2),
                'landslide_moderate_ha' => round((float) $h->landslide_moderate_ha, 2),
                'liquefaction_hsa_ha' => round((float) $h->liquefaction_hsa_ha, 2),
                'has_flood' => (bool) $h->has_flood,
                'has_landslide' => (bool) $h->has_landslide,
            ];
        })->values();

        $restrictions = EnvironmentalRestriction::with('zoneUnits')->get()->map(fn (EnvironmentalRestriction $r) => [
            'restriction_id' => $r->restriction_id,
            'restriction_name' => $r->restriction_name,
            'restriction_type' => $r->restriction_type,
            'level' => config("suitability.restriction_types.{$r->restriction_type}", 'regulated'),
            'description' => $r->description,
            'zone_count' => $r->zoneUnits->count(),
            'zones' => $r->zoneUnits->pluck('unit_name')->sort()->values(),
        ]);

        $protectedTypes = array_keys(array_filter(config('suitability.restriction_types', []), fn (string $level) => $level === 'protected'));

        return [
            'flood_risk_count' => $hazards->where('flood_high_ha', '>', 0)->count(),
            'landslide_count' => $hazards->where('has_landslide', true)->count(),
            'liquefaction_count' => $hazards->where('liquefaction_hsa_ha', '>', 0)->count(),
            'restricted_count' => $restrictions->pluck('zones')->flatten()->unique()->count(),
            'protected_count' => $restrictions->whereIn('restriction_type', $protectedTypes)->pluck('zones')->flatten()->unique()->count(),
            'flood_zones' => $hazards->where('flood_high_ha', '>', 0)->sortByDesc('flood_high_ha')->values(),
            'hazards' => $hazards,
            'restrictions' => $restrictions->values(),
            'watersheds' => self::WATERSHEDS,
            'not_loaded' => 'Storm surge, drought and sea level rise per barangay are not loaded yet (no verified source in TerraSpec).',
            'sources' => [
                'flood' => 'CLUP Table PF-19 (DENR-MGB XI, 2020)',
                'liquefaction' => 'CLUP Table PF-26 (MGB-XI and CDRRMO, 2020)',
                'landslide' => 'MGB 2020 landslide susceptibility map within PSA 2023 barangay boundaries',
                'restrictions' => 'Integrated Zoning Map 2020-2029 (digitized) and verified mangrove sites',
                'watersheds' => 'CLUP Tables PF-4 and PF-5',
            ],
        ];
    }
}
