<?php

namespace App\Http\Controllers;

use App\Models\EnvironmentalRestriction;
use App\Models\ZoneUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class EnvironmentalController extends Controller
{
    public function summary(): JsonResponse
    {
        $zones = ZoneUnit::with('hazardData')->get();

        // Zones with any High flood_high_ha exposure
        $floodZones = $zones
            ->filter(fn($z) => $z->hazardData && $z->hazardData->flood_high_ha > 0)
            ->map(fn($z) => [
                'zone_unit_id'  => $z->zone_unit_id,
                'unit_name'     => $z->unit_name,
                'unit_type'     => $z->unit_type,
                'flood_high_ha' => round((float) $z->hazardData->flood_high_ha, 2),
            ])
            ->sortByDesc('flood_high_ha')
            ->values();

        // All zones that have at least one hazard flag
        $hazardZones = $zones
            ->filter(fn($z) => $z->hazardData && (
                $z->hazardData->has_flood       ||
                $z->hazardData->has_landslide   ||
                $z->hazardData->has_storm_surge ||
                $z->hazardData->has_drought     ||
                $z->hazardData->has_sea_level_rise
            ))
            ->map(fn($z) => [
                'zone_unit_id'       => $z->zone_unit_id,
                'unit_name'          => $z->unit_name,
                'unit_type'          => $z->unit_type,
                'has_flood'          => (bool) $z->hazardData->has_flood,
                'has_landslide'      => (bool) $z->hazardData->has_landslide,
                'has_storm_surge'    => (bool) $z->hazardData->has_storm_surge,
                'has_drought'        => (bool) $z->hazardData->has_drought,
                'has_sea_level_rise' => (bool) $z->hazardData->has_sea_level_rise,
            ])
            ->sortBy('unit_name')
            ->values();

        // Restrictions with their affected zone lists
        $restrictions = EnvironmentalRestriction::with('zoneUnits')->get()
            ->map(fn($r) => [
                'restriction_id'   => $r->restriction_id,
                'restriction_name' => $r->restriction_name,
                'restriction_type' => $r->restriction_type,
                'description'      => $r->description,
                'zone_count'       => $r->zoneUnits->count(),
                'zones'            => $r->zoneUnits->pluck('unit_name')->sort()->values(),
            ]);

        $restrictedCount = DB::table('zone_restrictions')->distinct()->count('zone_unit_id');

        $protectedCount = DB::table('zone_restrictions')
            ->join('environmental_restrictions', 'zone_restrictions.restriction_id', '=', 'environmental_restrictions.restriction_id')
            ->whereIn('environmental_restrictions.restriction_type', ['Mangrove', 'Watershed'])
            ->distinct()
            ->count('zone_restrictions.zone_unit_id');

        return response()->json([
            'flood_risk_count' => $floodZones->count(),
            'restricted_count' => $restrictedCount,
            'protected_count'  => $protectedCount,
            'flood_zones'      => $floodZones,
            'hazard_zones'     => $hazardZones,
            'restrictions'     => $restrictions,
        ]);
    }
}
