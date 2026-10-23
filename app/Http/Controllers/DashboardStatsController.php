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
    private const SEVERITY = [
        'Mangrove' => 'high',
        'Watershed' => 'high',
        'SAFDZ' => 'medium',
        'Ecological' => 'medium',
        'Hazard' => 'low',
    ];

    public function __invoke(): JsonResponse
    {
        $hazardRows = ZoneHazardData::all();

        $flaggedCount = $hazardRows->filter(
            fn ($h) => $h->has_flood || $h->has_landslide || $h->has_storm_surge
                    || $h->has_drought || $h->has_sea_level_rise
        )->count();

        $breakdown = [
            'flood' => $hazardRows->where('has_flood', true)->count(),
            'landslide' => $hazardRows->where('has_landslide', true)->count(),
            'storm_surge' => $hazardRows->where('has_storm_surge', true)->count(),
            'drought' => $hazardRows->where('has_drought', true)->count(),
            'sea_level_rise' => $hazardRows->where('has_sea_level_rise', true)->count(),
        ];

        $restrictions = EnvironmentalRestriction::all()
            ->map(fn ($r) => [
                'id' => $r->restriction_id,
                'name' => $r->restriction_name,
                'type' => $r->restriction_type,
                'severity' => self::SEVERITY[$r->restriction_type] ?? 'low',
            ]);

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
