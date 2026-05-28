<?php

namespace Database\Seeders;

use App\Models\PopulationProjection;
use App\Models\ZoneUnit;
use Illuminate\Database\Seeder;

class PopulationProjectionSeeder extends Seeder
{
    public function run(): void
    {
        // Urban barangays grow at 2.5% p.a., rural at 1.5% p.a. (standard CLUP rates)
        $years = [2025, 2030, 2035];

        $zones = ZoneUnit::all();

        foreach ($zones as $zone) {
            $rate = $zone->unit_type === 'Urban' ? 0.025 : 0.015;
            $base = $zone->population_2020;

            foreach ($years as $year) {
                $n = $year - 2020;
                $projected = (int) round($base * pow(1 + $rate, $n));

                PopulationProjection::create([
                    'zone_unit_id' => $zone->zone_unit_id,
                    'year'         => $year,
                    'population'   => $projected,
                ]);
            }
        }
    }
}
