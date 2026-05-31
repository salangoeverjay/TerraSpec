<?php

namespace Database\Seeders;

use App\Models\EnvironmentalRestriction;
use App\Models\ZoneUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EnvironmentalRestrictionSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        DB::table('zone_restrictions')->truncate();
        EnvironmentalRestriction::truncate();
        Schema::enableForeignKeyConstraints();

        $restrictions = [
            [
                'restriction_name' => 'Panabo Mangrove Park',
                'restriction_type' => 'Mangrove',
                'description'      => 'Protected mangrove area along Cagangohan coastline. Development prohibited. Reforestation with DENR permit only.',
                'affected_zones'   => ['Cagangohan', 'San Pedro', 'San Vicente'],
            ],
            [
                'restriction_name' => 'Tibungol Watershed Reserve',
                'restriction_type' => 'Watershed',
                'description'      => 'Part of Lasang River Watershed system. Buffer zone protection. Reforestation with native species encouraged.',
                'affected_zones'   => ['Tibungol', 'Lower Panaga', 'A.O. Floirendo'],
            ],
            [
                'restriction_name' => 'Tuganay Watershed',
                'restriction_type' => 'Watershed',
                'description'      => 'Tuganay River Watershed. Largest watershed in Panabo at 8,109.16 hectares. Critical reforestation priority area.',
                'affected_zones'   => ['Katualan', 'Consolacion', 'Kauswagan', 'Upper Licanan', 'Waterfall'],
            ],
            [
                'restriction_name' => 'SAFDZ Agricultural Zone',
                'restriction_type' => 'SAFDZ',
                'description'      => 'Strategic Agriculture and Fisheries Development Zone. 13,998.66 hectares. Reforestation only in buffer zones.',
                'affected_zones'   => ['Dapco', 'Manay', 'Nanyo', 'Southern Davao', 'New Malitbog', 'Sindaton'],
            ],
        ];

        foreach ($restrictions as $data) {
            $affectedZones = $data['affected_zones'];
            unset($data['affected_zones']);

            $restriction = EnvironmentalRestriction::create($data);

            $zoneIds = ZoneUnit::whereIn('unit_name', $affectedZones)
                               ->pluck('zone_unit_id');

            foreach ($zoneIds as $zoneId) {
                DB::table('zone_restrictions')->insert([
                    'restriction_id' => $restriction->restriction_id,
                    'zone_unit_id'   => $zoneId,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }
        }
    }
}
