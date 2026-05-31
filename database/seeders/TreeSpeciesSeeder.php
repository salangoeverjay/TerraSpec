<?php

namespace Database\Seeders;

use App\Models\TreeSpecies;
use Illuminate\Database\Seeder;

class TreeSpeciesSeeder extends Seeder
{
    public function run(): void
    {
        TreeSpecies::truncate();

        $species = [
            [
                'common_name'       => 'Bakawan',
                'scientific_name'   => 'Rhizophora apiculata',
                'soil_preference'   => 'Silty clay / mudflat',
                'elevation_range'   => '0-3',
                'temperature_range' => '27-32',
                'salinity_level'    => 'High',
                'suitability_notes' => 'Dominant mangrove pioneer. Excellent coastal protection and erosion control. Best planted along tidal flats and estuary edges. Found along coastal barangays of Panabo: Cagangohan, San Pedro, San Vicente, J.P. Laurel.',
            ],
            [
                'common_name'       => 'Pagatpat',
                'scientific_name'   => 'Sonneratia alba',
                'soil_preference'   => 'Sandy / muddy',
                'elevation_range'   => '0-2',
                'temperature_range' => '26-32',
                'salinity_level'    => 'High',
                'suitability_notes' => 'Fast-growing mangrove. Good for primary reforestation in open coastal areas. Tolerates wave action. Suitable for Cagangohan mariculture zone and coastal buffer areas.',
            ],
            [
                'common_name'       => 'Nipa Palm',
                'scientific_name'   => 'Nypa fruticans',
                'soil_preference'   => 'Alluvial / brackish',
                'elevation_range'   => '0-4',
                'temperature_range' => '27-32',
                'salinity_level'    => 'Med',
                'suitability_notes' => 'Riverbank and estuary stabilizer. Thrives in brackish water zones along Lasang, Tuganay, Bunawan and Panabo river systems. Provides habitat and livelihood (nipa shingles, vinegar).',
            ],
            [
                'common_name'       => 'Molave',
                'scientific_name'   => 'Vitex parviflora',
                'soil_preference'   => 'Sandy loam / upland',
                'elevation_range'   => '5-200',
                'temperature_range' => '25-32',
                'salinity_level'    => 'None',
                'suitability_notes' => 'Hardwood species for upland reforestation. Drought-tolerant once established. Suitable for Class B land capability areas: Dalisay, Manay, Kauswagan, Kasilak, Upper Licanan, Tagpore. Dominant slope 8-18%.',
            ],
            [
                'common_name'       => 'Ipil',
                'scientific_name'   => 'Intsia bijuga',
                'soil_preference'   => 'Well-drained loam',
                'elevation_range'   => '0-600',
                'temperature_range' => '24-32',
                'salinity_level'    => 'None',
                'suitability_notes' => 'Premium timber and shade tree. Wide elevation tolerance. Best in Class A land areas: A.O. Floirendo, Lower Panaga, Tibungol, Dapco, Southern Davao. Dominant soil: Cabangan Clay Loam and Camasan Sandy Clay Loam.',
            ],
            [
                'common_name'       => 'Dao',
                'scientific_name'   => 'Dracontomelon dao',
                'soil_preference'   => 'Clay / loam',
                'elevation_range'   => '100-500',
                'temperature_range' => '24-30',
                'salinity_level'    => 'None',
                'suitability_notes' => 'Upland mixed forest species. Requires higher elevation and cooler temperatures. Suitable for hilly barangays: Mabunao, Malativas, Buenavista, Waterfall, San Roque, Kiotoy. Dominant slope 18-30%, Class C land capability.',
            ],
            [
                'common_name'       => 'Toog',
                'scientific_name'   => 'Petersianthus quadrialatus',
                'soil_preference'   => 'Deep loam / clay',
                'elevation_range'   => '0-400',
                'temperature_range' => '25-32',
                'salinity_level'    => 'None',
                'suitability_notes' => 'Watershed protection species. Deep root system prevents erosion and stabilizes slopes. Critical for Tuganay, Lasang, Bunawan and Panabo watersheds. Suitable for Class B and C areas: Consolacion, Katualan, Santa Cruz, Upper Licanan, Waterfall.',
            ],
        ];

        foreach ($species as $row) {
            TreeSpecies::create($row);
        }
    }
}
