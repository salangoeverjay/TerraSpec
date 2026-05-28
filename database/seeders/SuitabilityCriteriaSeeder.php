<?php

namespace Database\Seeders;

use App\Models\SuitabilityCriteria;
use Illuminate\Database\Seeder;

class SuitabilityCriteriaSeeder extends Seeder
{
    public function run(): void
    {
        SuitabilityCriteria::truncate();

        // [criteria_name, default, commercial, residential, industrial, agricultural, reforestation]
        // Each column sums to 1.00
        $criteria = [
            ['Flood Risk',         0.30, 0.25, 0.35, 0.30, 0.20, 0.15],
            ['Slope Suitability',  0.20, 0.20, 0.20, 0.25, 0.15, 0.20],
            ['Liquefaction Risk',  0.10, 0.10, 0.15, 0.15, 0.05, 0.05],
            ['Population Density', 0.15, 0.25, 0.15, 0.05, 0.00, 0.00],
            ['Market Saturation',  0.10, 0.15, 0.05, 0.05, 0.00, 0.00],
            ['Soil Suitability',   0.10, 0.05, 0.05, 0.10, 0.45, 0.40],
            ['Zoning Compliance',  0.05, 0.00, 0.05, 0.10, 0.15, 0.20],
        ];

        foreach ($criteria as $row) {
            SuitabilityCriteria::create([
                'criteria_name'        => $row[0],
                'default_weight'       => $row[1],
                'commercial_weight'    => $row[2],
                'residential_weight'   => $row[3],
                'industrial_weight'    => $row[4],
                'agricultural_weight'  => $row[5],
                'reforestation_weight' => $row[6],
            ]);
        }
    }
}
