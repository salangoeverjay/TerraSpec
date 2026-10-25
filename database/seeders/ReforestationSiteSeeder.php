<?php

namespace Database\Seeders;

use App\Models\ReforestationSite;
use Illuminate\Database\Seeder;

/**
 * Seeds the actual mangrove reforestation sites from public/data/mangrove_sites.geojson.
 *
 * Source: Mangrove Reforestation and Rehabilitation.kml (database/seeders/data/mangrove_reforestation_sites.kml),
 * converted with GDAL: site polygons only (corner pins dropped), areas in EPSG:32651, barangay = containing or
 * nearest PSA 2023 boundary (most sites lie seaward of it), zoning shares from the digitized Integrated Zoning Map.
 */
class ReforestationSiteSeeder extends Seeder
{
    use MatchesZoneUnits;

    public function run(): void
    {
        $sites = json_decode(file_get_contents(public_path('data/mangrove_sites.geojson')), true);
        ReforestationSite::query()->delete();

        foreach ($sites['features'] as $feature) {
            $site = $feature['properties'];

            ReforestationSite::create([
                'zone_unit_id' => $this->zoneIdFor($site['barangay'], 'public/data/mangrove_sites.geojson'),
                'name' => $site['name'],
                'site_type' => 'mangrove',
                'status' => $site['status'],
                'year' => $site['year'],
                'adopter' => $site['adopter'],
                'area_ha' => $site['area_ha'],
                'mangrove_zone_share' => $site['mangrove_zone_share'],
                'other_zone_share' => $site['other_zone_share'],
                'unzoned_share' => $site['unzoned_share'],
                'distance_to_boundary_m' => $site['distance_to_boundary_m'],
            ]);
        }
    }
}
