<?php

namespace App\Http\Controllers;

use App\Models\ZoneHazardData;
use Illuminate\Http\JsonResponse;

class DashboardStatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $hazardRows = ZoneHazardData::all();

        $flaggedCount = $hazardRows->filter(
            fn ($h) => $h->has_flood || $h->has_landslide || $h->has_storm_surge || $h->has_drought || $h->has_sea_level_rise
        )->count();

        $breakdown = [
            'flood'          => $hazardRows->where('has_flood', true)->count(),
            'landslide'      => $hazardRows->where('has_landslide', true)->count(),
            'storm_surge'    => $hazardRows->where('has_storm_surge', true)->count(),
            'drought'        => $hazardRows->where('has_drought', true)->count(),
            'sea_level_rise' => $hazardRows->where('has_sea_level_rise', true)->count(),
        ];

        return response()->json([
            'flagged_count' => $flaggedCount,
            'breakdown'     => $breakdown,
        ]);
    }
}
