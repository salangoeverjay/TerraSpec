<?php

namespace Database\Seeders;

use App\Models\SuitabilityAnalysis;
use App\Services\SuitabilityScoreService;
use Illuminate\Database\Seeder;

class SuitabilityAnalysisSeeder extends Seeder
{
    public function run(): void
    {
        SuitabilityAnalysis::truncate();

        $scorer = new SuitabilityScoreService();
        $types  = ['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'];

        foreach ($types as $type) {
            $results = $scorer->calculateAll($type);

            foreach ($results as $r) {
                $zone   = $r['zone'];
                $scores = $r['scores'];

                SuitabilityAnalysis::create([
                    'zone_unit_id'       => $zone->zone_unit_id,
                    'user_id'            => null,
                    'analysis_type'      => $type,
                    'use_subtype'        => null,
                    'flood_score'        => $scores['flood'],
                    'slope_score'        => $scores['slope'],
                    'soil_score'         => $scores['soil'],
                    'population_score'   => $scores['population'],
                    'saturation_score'   => $scores['saturation'],
                    'liquefaction_score' => $scores['liquefaction'],
                    'total_score'        => $r['total_score'],
                    'suitability_level'  => $r['suitability_level'],
                    'criteria_breakdown' => $r['criteria_breakdown'],
                    'applied_weights'    => $r['applied_weights'],
                ]);
            }

            $this->command->info("  {$type}: " . $results->count() . " zones scored.");
        }
    }
}
