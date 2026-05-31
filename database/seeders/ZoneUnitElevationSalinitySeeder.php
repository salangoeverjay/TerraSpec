<?php

namespace Database\Seeders;

use App\Models\ZoneUnit;
use Illuminate\Database\Seeder;

class ZoneUnitElevationSalinitySeeder extends Seeder
{
    public function run(): void
    {
        $elevationData = [
            'Santo Nino'       => [0,   20],
            'Cagangohan'       => [0,   20],
            'Gredu'            => [0,   20],
            'J.P. Laurel'      => [0,   20],
            'New Visayas'      => [0,   35],
            'New Pandan'       => [0,   20],
            'Quezon'           => [0,   35],
            'Salvacion'        => [0,   35],
            'San Francisco'    => [0,   20],
            'San Vicente'      => [0,   20],
            'San Pedro'        => [0,   20],
            'A.O. Floirendo'   => [0,  200],
            'Datu Abdul Dadia' => [0,   90],
            'Buenavista'       => [35, 300],
            'Cacao'            => [20, 200],
            'Consolacion'      => [20, 200],
            'Dapco'            => [0,   90],
            'Kasilak'          => [20, 200],
            'Katipunan'        => [20, 200],
            'Katualan'         => [50, 500],
            'Kauswagan'        => [20, 200],
            'Kiotoy'           => [35, 300],
            'Little Panay'     => [20,  90],
            'Lower Panaga'     => [0,   35],
            'Mabunao'          => [35, 300],
            'Maduao'           => [0,   90],
            'Malativas'        => [35, 300],
            'Manay'            => [0,  200],
            'Nanyo'            => [0,   90],
            'New Malaga'       => [20, 200],
            'New Malitbog'     => [0,   90],
            'San Nicolas'      => [20, 200],
            'San Roque'        => [35, 300],
            'Santa Cruz'       => [50, 500],
            'Sindaton'         => [0,   90],
            'Southern Davao'   => [0,   90],
            'Tagpore'          => [20, 200],
            'Tibungol'         => [0,  200],
            'Upper Licanan'    => [35, 300],
            'Waterfall'        => [35, 300],
        ];

        $salinityData = [
            // Coastal barangays — Davao Gulf frontage
            'Cagangohan'       => 'High',
            'San Pedro'        => 'High',
            'San Vicente'      => 'High',
            'J.P. Laurel'      => 'High',
            'Gredu'            => 'High',
            'New Pandan'       => 'High',
            'Santo Nino'       => 'High',
            'San Francisco'    => 'High',

            // Near river / brackish zones
            'New Visayas'      => 'Med',
            'Salvacion'        => 'Med',
            'Quezon'           => 'Med',
            'A.O. Floirendo'   => 'Med',
            'Lower Panaga'     => 'Med',
            'Maduao'           => 'Med',
            'Nanyo'            => 'Med',
            'Manay'            => 'Med',
            'Dapco'            => 'Med',
            'Sindaton'         => 'Med',

            // Inland / upland
            'Buenavista'       => 'None',
            'Cacao'            => 'None',
            'Consolacion'      => 'None',
            'Datu Abdul Dadia' => 'None',
            'Kasilak'          => 'None',
            'Katipunan'        => 'None',
            'Katualan'         => 'None',
            'Kauswagan'        => 'None',
            'Kiotoy'           => 'None',
            'Little Panay'     => 'None',
            'Mabunao'          => 'None',
            'Malativas'        => 'None',
            'New Malaga'       => 'None',
            'New Malitbog'     => 'None',
            'San Nicolas'      => 'None',
            'San Roque'        => 'None',
            'Santa Cruz'       => 'None',
            'Southern Davao'   => 'None',
            'Tagpore'          => 'None',
            'Tibungol'         => 'None',
            'Upper Licanan'    => 'None',
            'Waterfall'        => 'None',
        ];

        foreach ($elevationData as $name => [$min, $max]) {
            ZoneUnit::where('unit_name', $name)->update([
                'elevation_min' => $min,
                'elevation_max' => $max,
            ]);
        }

        foreach ($salinityData as $name => $salinity) {
            ZoneUnit::where('unit_name', $name)->update([
                'salinity_level' => $salinity,
            ]);
        }
    }
}
