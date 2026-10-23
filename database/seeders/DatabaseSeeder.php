<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            LguAdminSeeder::class,
            ZoneUnitSeeder::class,
            ZoneHazardDataSeeder::class,
            ZoneZoningDataSeeder::class,
            ZoneSoilDataSeeder::class,
            PopulationProjectionSeeder::class,
            SuitabilityCriteriaSeeder::class,
            ReforestationSiteSeeder::class,
            SuitabilityAnalysisSeeder::class,
            ZoneUnitElevationSalinitySeeder::class,
            TreeSpeciesSeeder::class,
            EnvironmentalRestrictionSeeder::class,
        ]);
    }
}
