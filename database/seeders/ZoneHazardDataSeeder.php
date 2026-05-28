<?php

namespace Database\Seeders;

use App\Models\ZoneHazardData;
use App\Models\ZoneUnit;
use Illuminate\Database\Seeder;

class ZoneHazardDataSeeder extends Seeder
{
    public function run(): void
    {
        // [name, flood_high, flood_moderate, flood_low, flood_none,
        //  liq_hsa, liq_lsa, liq_msa,
        //  has_flood, has_landslide, has_storm_surge, has_drought, has_sea_level_rise]
        $hazardData = [
            ['Santo Nino',        51.08,  54.81,    11.15,    0.00,    4.97,    0.00,   105.09, true,  false, true,  true,  true ],
            ['Cagangohan',       141.08,   0.00,   176.32,    0.00,    0.00,    0.00,    69.07, true,  false, false, true,  true ],
            ['Gredu',              0.00,  21.96,   101.74,    0.00,    0.51,    0.00,   123.18, true,  false, true,  true,  false],
            ['J.P. Laurel',      185.56,  61.27,   264.32,    0.00,   17.26,    0.00,   261.73, true,  false, true,  true,  true ],
            ['New Visayas',        0.00,  22.51,   390.72,    0.00,  391.21,    0.00,    22.02, true,  false, false, true,  false],
            ['New Pandan',        55.36,   0.00,    86.49,    0.00,    0.00,    0.00,   120.84, true,  false, false, true,  false],
            ['Quezon',             0.00,   3.87,   142.20,  101.68,  247.76,    0.00,     0.00, true,  false, false, true,  false],
            ['Salvacion',          0.00, 108.99,    74.75,   19.93,  203.67,    0.00,     0.00, true,  false, false, true,  false],
            ['San Francisco',      8.84,  43.38,   141.81,    4.13,  152.76,    0.00,    45.40, true,  false, false, true,  false],
            ['San Vicente',       37.85, 401.37,    37.25,    0.00,  153.75,    0.00,   252.88, true,  false, true,  false, false],
            ['San Pedro',        193.27,   1.72,    68.24,    0.00,    0.00,    0.00,    23.50, true,  false, true,  true,  true ],
            ['A.O. Floirendo',     0.00,  22.15,  1661.19, 1697.53, 2291.40,  126.55,   962.91, true,  true,  false, true,  false],
            ['Datu Abdul Dadia',   0.00,  57.75,   530.55,    0.00,  579.73,    0.00,     8.57, true,  true,  false, true,  false],
            ['Buenavista',         0.00,   5.42,    15.56,  537.95,    0.00,  171.64,     0.00, false, true,  false, true,  false],
            ['Cacao',              0.00,   0.00,    10.18,  582.97,    0.00,  593.15,     0.00, false, true,  false, true,  false],
            ['Consolacion',        0.09,   0.00,     1.01,  419.29,    0.00,  420.39,     0.00, false, true,  false, false, false],
            ['Dapco',            405.08,  14.03,   534.62,   88.83,  808.61,    0.00,   233.94, true,  false, false, true,  false],
            ['Kasilak',           74.36,  64.48,    69.57,  664.01,    0.00,  866.70,     5.72, true,  true,  false, true,  false],
            ['Katipunan',          0.00,  30.08,   346.92,  598.90,   76.34,  371.09,   528.47, true,  true,  false, true,  false],
            ['Katualan',           0.00,   0.00,     0.00,  429.21,    0.00,    0.00,     0.00, false, true,  false, true,  false],
            ['Kauswagan',          0.00,   0.00,     0.82,  752.72,    0.00,  753.54,     0.00, false, true,  false, true,  false],
            ['Kiotoy',            12.75,   1.85,     0.00,  676.41,    0.00,  128.73,     0.00, true,  true,  false, true,  false],
            ['Little Panay',       0.00, 171.88,   450.09,    5.56,  606.11,    0.00,    21.41, true,  false, false, true,  false],
            ['Lower Panaga',     135.11,  23.81,     0.00,  363.71,  133.54,    0.00,   389.09, true,  true,  false, true,  false],
            ['Mabunao',            0.00,   1.90,     0.00, 1017.89,    0.00,    0.00,     0.00, false, true,  false, true,  false],
            ['Maduao',             0.00,  11.58,    69.09,  259.33,  330.33,    0.00,     9.66, true,  false, false, true,  false],
            ['Malativas',          0.00,   0.00,    27.21,  911.09,    0.00,  433.06,     0.00, true,  true,  false, true,  false],
            ['Manay',            120.45,  13.77,   171.43,  938.78,    0.00,  398.91,   845.51, true,  true,  false, true,  false],
            ['Nanyo',              0.00,  45.39,   501.74,   96.97,  623.33,    0.00,    20.77, true,  true,  false, true,  false],
            ['New Malaga',         0.00,   0.00,     0.00,    0.00,   73.92,   14.45,   388.32, true,  true,  false, true,  false],
            ['New Malitbog',       0.00,  42.80,   172.92,  260.97,   73.92,   14.45,   388.32, true,  true,  false, true,  false],
            ['San Nicolas',        0.00,   9.09,     0.00,  655.38,    3.87,  261.25,   124.89, true,  true,  false, true,  false],
            ['San Roque',          0.00,   0.00,     0.00,  253.29,    0.00,    0.00,     0.00, false, true,  false, true,  false],
            ['Santa Cruz',         0.00,  24.82,     0.00,  981.99,    0.00,    0.00,     0.00, true,  true,  false, true,  false],
            ['Sindaton',         169.11,  21.92,   238.58,  378.38,  704.44,    0.00,   103.56, true,  true,  false, true,  false],
            ['Southern Davao',     0.00,  21.90,   457.12,   17.55,  496.57,    0.00,     0.00, true,  false, false, true,  false],
            ['Tagpore',            0.00,  72.13,    47.82,  497.93,  136.62,  126.54,   354.71, true,  false, false, true,  false],
            ['Tibungol',          35.41,   0.00,    90.40,  654.08,   88.85,   15.57,   675.47, true,  true,  false, true,  false],
            ['Upper Licanan',      0.00,  21.30,    80.13,  293.94,  116.68,  126.39,   152.29, true,  true,  false, true,  false],
            ['Waterfall',          1.88,   1.42,    49.85,  382.61,    0.00,  247.99,     0.00, false, true,  false, true,  false],
        ];

        $zoneMap = ZoneUnit::pluck('zone_unit_id', 'unit_name');

        foreach ($hazardData as $row) {
            $zoneUnitId = $zoneMap[$row[0]] ?? null;
            if (!$zoneUnitId) continue;

            ZoneHazardData::create([
                'zone_unit_id'        => $zoneUnitId,
                'flood_high_ha'       => $row[1],
                'flood_moderate_ha'   => $row[2],
                'flood_low_ha'        => $row[3],
                'flood_none_ha'       => $row[4],
                'liquefaction_hsa_ha' => $row[5],
                'liquefaction_lsa_ha' => $row[6],
                'liquefaction_msa_ha' => $row[7],
                'has_flood'           => $row[8],
                'has_landslide'       => $row[9],
                'has_storm_surge'     => $row[10],
                'has_drought'         => $row[11],
                'has_sea_level_rise'  => $row[12],
            ]);
        }
    }
}
