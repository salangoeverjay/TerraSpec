<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ZoneUnitSeeder::class,
            ZoneHazardDataSeeder::class,
            ZoneSoilDataSeeder::class,
            PopulationProjectionSeeder::class,
            SuitabilityCriteriaSeeder::class,
            SuitabilityAnalysisSeeder::class,
        ]);
    }
}
