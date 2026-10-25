<?php

namespace App\Http\Controllers;

use App\Models\EnvironmentalRestriction;
use App\Models\MangroveSpecies;
use App\Models\Report;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use Illuminate\Http\JsonResponse;

class DashboardStatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $hazardRows = ZoneHazardData::all();

        // Barangays with high hazard in verified sources: CLUP PF-19 high flood or MGB 2020 high landslide
        $flaggedCount = $hazardRows->filter(fn ($h) => $h->flood_high_ha > 0 || $h->landslide_high_ha > 0)->count();

        $breakdown = [
            'flood' => $hazardRows->where('flood_high_ha', '>', 0)->count(),
            'landslide' => $hazardRows->where('landslide_high_ha', '>', 0)->count(),
            'liquefaction' => $hazardRows->where('liquefaction_hsa_ha', '>', 0)->count(),
        ];

        // Protected restrictions first ("high"), then regulated ones ("medium")
        $restrictions = EnvironmentalRestriction::all()
            ->map(fn ($r) => [
                'id' => $r->restriction_id,
                'name' => $r->restriction_name,
                'type' => $r->restriction_type,
                'severity' => config("suitability.restriction_types.{$r->restriction_type}") === 'protected' ? 'high' : 'medium',
            ])
            ->sortBy(fn (array $r) => $r['severity'] === 'high' ? 0 : 1)
            ->values();
        // Mangrove reforestation study: true mangroves only, conservation priorities first
        $species = MangroveSpecies::where('category', 'true_mangrove')
            ->orderByRaw("CASE WHEN iucn_status IN ('Vulnerable', 'Near threatened') THEN 0 ELSE 1 END")
            ->orderBy('list_order')
            ->take(5)
            ->get()
            ->map(fn (MangroveSpecies $s) => [
                'species_id' => $s->id,
                'common_name' => $s->local_name,
                'scientific_name' => $s->scientific_name,
                'iucn_status' => $s->iucn_status,
                'tidal_zone' => ucfirst(str_replace('_', ' ', $s->tidal_zone)),
            ]);

        $reportCount = class_exists(Report::class)
            ? Report::whereNotIn('status', ['Archived'])->count()
            : 0;

        return response()->json([
            'zone_count' => ZoneUnit::count(),
            'flagged_count' => $flaggedCount,
            'report_count' => $reportCount,
            'breakdown' => $breakdown,
            'restrictions' => $restrictions,
            'species' => $species,
        ]);
    }
}
