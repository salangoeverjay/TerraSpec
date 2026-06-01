<?php

namespace App\Http\Controllers;

use App\Models\EnvironmentalRestriction;
use App\Models\Report;
use App\Models\TreeSpecies;
use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use Illuminate\Http\JsonResponse;

class DashboardStatsController extends Controller
{
    private const SEVERITY = [
        'Mangrove'   => 'high',
        'Watershed'  => 'high',
        'SAFDZ'      => 'medium',
        'Ecological' => 'medium',
        'Hazard'     => 'low',
    ];

    public function __invoke(): JsonResponse
    {
        $hazardRows = ZoneHazardData::all();

        $flaggedCount = $hazardRows->filter(
            fn ($h) => $h->has_flood || $h->has_landslide || $h->has_storm_surge
                    || $h->has_drought || $h->has_sea_level_rise
        )->count();

        $breakdown = [
            'flood'          => $hazardRows->where('has_flood', true)->count(),
            'landslide'      => $hazardRows->where('has_landslide', true)->count(),
            'storm_surge'    => $hazardRows->where('has_storm_surge', true)->count(),
            'drought'        => $hazardRows->where('has_drought', true)->count(),
            'sea_level_rise' => $hazardRows->where('has_sea_level_rise', true)->count(),
        ];

        $restrictions = EnvironmentalRestriction::all()
            ->map(fn ($r) => [
                'id'       => $r->restriction_id,
                'name'     => $r->restriction_name,
                'type'     => $r->restriction_type,
                'severity' => self::SEVERITY[$r->restriction_type] ?? 'low',
            ]);

        $species = TreeSpecies::select(['species_id','common_name','scientific_name','soil_preference','salinity_level'])
            ->take(5)
            ->get();

        $reportCount = class_exists(\App\Models\Report::class)
            ? Report::whereNotIn('status', ['Archived'])->count()
            : 0;

        return response()->json([
            'zone_count'    => ZoneUnit::count(),
            'flagged_count' => $flaggedCount,
            'report_count'  => $reportCount,
            'breakdown'     => $breakdown,
            'restrictions'  => $restrictions,
            'species'       => $species,
        ]);
    }
}
