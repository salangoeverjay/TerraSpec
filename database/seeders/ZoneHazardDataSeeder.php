<?php

namespace Database\Seeders;

use App\Models\ZoneHazardData;
use Illuminate\Database\Seeder;

class ZoneHazardDataSeeder extends Seeder
{
    use MatchesZoneUnits;

    public function run(): void
    {
        // Rebuilt from the sources below on every run
        ZoneHazardData::query()->delete();

        // [name, flood_high, flood_moderate, flood_low, flood_none (CLUP Table PF-19),
        //  liq_hsa, liq_lsa, liq_msa (CLUP Table PF-26)]
        $hazardData = [
            ['Santo Nino',        51.08,  54.81,    11.15,    0.00,    4.97,    0.00,   105.09],
            ['Cagangohan',       141.08,   0.00,   176.32,    0.00,    0.00,    0.00,    69.07],
            ['Gredu',              0.00,  21.96,   101.74,    0.00,    0.51,    0.00,   123.18],
            ['J.P. Laurel',      185.56,  61.27,   264.32,    0.00,   17.26,    0.00,   261.73],
            ['New Visayas',        0.00,  22.51,   390.72,    0.00,  391.21,    0.00,    22.02],
            ['New Pandan',        55.36,   0.00,    86.49,    0.00,    0.00,    0.00,   120.84],
            ['Quezon',             0.00,   3.87,   142.20,  101.68,  247.76,    0.00,     0.00],
            ['Salvacion',          0.00, 108.99,    74.75,   19.93,  203.67,    0.00,     0.00],
            ['San Francisco',      8.84,  43.38,   141.81,    4.13,  152.76,    0.00,    45.40],
            ['San Vicente',       37.85, 401.37,    37.25,    0.00,  153.75,    0.00,   252.88],
            ['San Pedro',        193.27,   1.72,    68.24,    0.00,    0.00,    0.00,    23.50],
            ['A.O. Floirendo',     0.00,  22.15,  1661.19, 1697.53, 2291.40,  126.55,   962.91],
            ['Datu Abdul Dadia',   0.00,  57.75,   530.55,    0.00,  579.73,    0.00,     8.57],
            ['Buenavista',         0.00,   5.42,    15.56,  537.95,    0.00,  171.64,     0.00],
            ['Cacao',              0.00,   0.00,    10.18,  582.97,    0.00,  593.15,     0.00],
            ['Consolacion',        0.09,   0.00,     1.01,  419.29,    0.00,  420.39,     0.00],
            ['Dapco',            405.08,  14.03,   534.62,   88.83,  808.61,    0.00,   233.94],
            ['Kasilak',           74.36,  64.48,    69.57,  664.01,    0.00,  866.70,     5.72],
            ['Katipunan',          0.00,  30.08,   346.92,  598.90,   76.34,  371.09,   528.47],
            ['Katualan',           0.00,   0.00,     0.00,  429.21,    0.00,    0.00,     0.00],
            ['Kauswagan',          0.00,   0.00,     0.82,  752.72,    0.00,  753.54,     0.00],
            ['Kiotoy',            12.75,   1.85,     0.00,  676.41,    0.00,  128.73,     0.00],
            ['Little Panay',       0.00, 171.88,   450.09,    5.56,  606.11,    0.00,    21.41],
            ['Lower Panaga',     135.11,  23.81,     0.00,  363.71,  133.54,    0.00,   389.09],
            ['Mabunao',            0.00,   1.90,     0.00, 1017.89,    0.00,    0.00,     0.00],
            ['Maduao',             0.00,  11.58,    69.09,  259.33,  330.33,    0.00,     9.66],
            ['Malativas',          0.00,   0.00,    27.21,  911.09,    0.00,  433.06,     0.00],
            ['Manay',            120.45,  13.77,   171.43,  938.78,    0.00,  398.91,   845.51],
            ['Nanyo',              0.00,  45.39,   501.74,   96.97,  623.33,    0.00,    20.77],
            // Listed as "Dalisay" in CLUP Tables PF-19 (p.80) and PF-26 (p.88)
            ['New Malaga',        46.49,   0.00,    37.77,  447.34,    0.00,  531.60,     0.00],
            ['New Malitbog',       0.00,  42.80,   172.92,  260.97,   73.92,   14.45,   388.32],
            ['San Nicolas',        0.00,   9.09,     0.00,  655.38,    3.87,  261.25,   124.89],
            ['San Roque',          0.00,   0.00,     0.00,  253.29,    0.00,    0.00,     0.00],
            ['Santa Cruz',         0.00,  24.82,     0.00,  981.99,    0.00,    0.00,     0.00],
            ['Sindaton',         169.11,  21.92,   238.58,  378.38,  704.44,    0.00,   103.56],
            ['Southern Davao',     0.00,  21.90,   457.12,   17.55,  496.57,    0.00,     0.00],
            ['Tagpore',            0.00,  72.13,    47.82,  497.93,  136.62,  126.54,   354.71],
            ['Tibungol',          35.41,   0.00,    90.40,  654.08,   88.85,   15.57,   675.47],
            ['Upper Licanan',      0.00,  21.30,    80.13,  293.94,  116.68,  126.39,   152.29],
            ['Waterfall',          1.88,   1.42,    49.85,  382.61,    0.00,  247.99,     0.00],
        ];

        // MGB 2020 landslide map within PSA 2023 boundaries (see data/barangay_landslide.json)
        $landslide = json_decode(file_get_contents(database_path('seeders/data/barangay_landslide.json')), true)['barangays'];

        // "None" column of CLUP Table PF-26 (p.88-89); barangays not listed have 0 ha
        $liquefactionNone = [
            'Buenavista' => 387.29, 'Cagangohan' => 248.33, 'J.P. Laurel' => 232.17, 'Katualan' => 429.21,
            'Kiotoy' => 562.29, 'Mabunao' => 1019.79, 'Malativas' => 505.24, 'New Pandan' => 21.01,
            'San Nicolas' => 274.46, 'San Pedro' => 239.73, 'San Roque' => 253.29, 'San Vicente' => 69.85,
            'Santa Cruz' => 1006.81, 'Santo Nino' => 6.97, 'Waterfall' => 187.78,
        ];

        // A misspelt name in the partial "None" list would silently become 0 ha
        foreach (array_keys($liquefactionNone) as $name) {
            $this->zoneIdFor($name, 'CLUP Table PF-26 (None column)');
        }
        $liquefactionNone = collect($liquefactionNone)->mapWithKeys(fn (float $ha, string $name) => [$this->nameKey($name) => $ha]);

        foreach ($hazardData as $row) {
            $slide = $this->entryFor($landslide, $row[0], 'data/barangay_landslide.json');

            ZoneHazardData::create([
                'zone_unit_id' => $this->zoneIdFor($row[0], 'CLUP Tables PF-19/PF-26'),
                'flood_high_ha' => $row[1],
                'flood_moderate_ha' => $row[2],
                'flood_low_ha' => $row[3],
                'flood_none_ha' => $row[4],
                'liquefaction_hsa_ha' => $row[5],
                'liquefaction_lsa_ha' => $row[6],
                'liquefaction_msa_ha' => $row[7],
                'liquefaction_none_ha' => $liquefactionNone[$this->nameKey($row[0])] ?? 0,
                'landslide_high_ha' => $slide['landslide_high_ha'],
                'landslide_moderate_ha' => $slide['landslide_moderate_ha'],
                // Flags follow the verified areas: any flood class in PF-19, any landslide class on the MGB map
                'has_flood' => ($row[1] + $row[2] + $row[3]) > 0,
                'has_landslide' => ($slide['landslide_high_ha'] + $slide['landslide_moderate_ha']) > 0,
                // No verified per-barangay source is loaded yet: unknown, not "no"
                'has_storm_surge' => null,
                'has_drought' => null,
                'has_sea_level_rise' => null,
            ]);
        }
    }
}
