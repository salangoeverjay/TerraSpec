<?php

namespace Database\Seeders;

use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Seeds per-barangay zoning class areas from data/barangay_zoning.json.
 *
 * Source: Panabo City Integrated Zoning Map C.Y. 2020-2029 (digitized, public/data/zoning_2020.geojson)
 * intersected with PSA 2023 barangay boundaries (faeldon/philippines-json-maps, MIT) and the
 * MGB 2020 flood (Very High) and landslide (High) susceptibility layers; areas in EPSG:32651.
 */
class ZoneZoningDataSeeder extends Seeder
{
    public function run(): void
    {
        /** @var array<string, array{name: string, area_ha: float, zoning: array<string, array{area_ha: float, flood_very_high_ha: float, landslide_high_ha: float}>}> $barangays */
        $barangays = json_decode(file_get_contents(database_path('seeders/data/barangay_zoning.json')), true);

        ZoneZoningData::query()->delete();

        foreach (ZoneUnit::all() as $zone) {
            $key = $this->normalize($zone->unit_name);

            if (! isset($barangays[$key])) {
                throw new RuntimeException("No zoning data for zone unit '{$zone->unit_name}'.");
            }

            foreach ($barangays[$key]['zoning'] as $code => $row) {
                ZoneZoningData::create([
                    'zone_unit_id' => $zone->zone_unit_id,
                    'zoning_code' => $code,
                    'area_ha' => $row['area_ha'],
                    'flood_very_high_ha' => $row['flood_very_high_ha'],
                    'landslide_high_ha' => $row['landslide_high_ha'],
                ]);
            }
        }
    }

    private function normalize(string $name): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($name)));
    }
}
