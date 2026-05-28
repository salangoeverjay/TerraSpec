<?php

namespace Database\Seeders;

use App\Models\ZoneSoilData;
use App\Models\ZoneUnit;
use Illuminate\Database\Seeder;

class ZoneSoilDataSeeder extends Seeder
{
    public function run(): void
    {
        $zones = ZoneUnit::all();

        foreach ($zones as $zone) {
            $cabangan   = 0;
            $camasan    = 0;
            $matina     = 0;
            $sanManuel  = 0;

            // Assign total_area_ha to the dominant soil column
            switch ($zone->dominant_soil_type) {
                case 'Cabangan Clay Loam':
                    $cabangan = $zone->total_area_ha;
                    break;
                case 'Camasan Sandy Clay Loam':
                    $camasan = $zone->total_area_ha;
                    break;
                case 'Matina Clay Loam':
                    $matina = $zone->total_area_ha;
                    break;
                case 'San Manuel Silty Clay Loam':
                    $sanManuel = $zone->total_area_ha;
                    break;
            }

            ZoneSoilData::create([
                'zone_unit_id'                  => $zone->zone_unit_id,
                'cabangan_clay_loam_ha'         => $cabangan,
                'camasan_sandy_clay_loam_ha'    => $camasan,
                'matina_clay_loam_ha'           => $matina,
                'san_manuel_silty_clay_loam_ha' => $sanManuel,
            ]);
        }
    }
}
