<?php

namespace Database\Seeders;

use App\Models\ZoneUnit;
use Illuminate\Database\Seeder;

class ZoneUnitSeeder extends Seeder
{
    public function run(): void
    {
        // [unit_name, unit_type, total_area_ha, population_2020, household_count,
        //  population_density, avg_household_size, settlement_tier, saturation_index,
        //  dominant_soil_type, dominant_slope_class, land_capability_class]
        $barangays = [
            ['Santo Nino',        'Urban', 98,   5156,  1289, 5261,  4, 'CBD',          0.90, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Cagangohan',        'Urban', 412,  13224, 2645, 3210,  5, 'CBD',          0.90, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Gredu',             'Urban', 109,  16252, 3250, 14910, 5, 'CBD',          0.90, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['J.P. Laurel',       'Urban', 609,  9458,  1182, 1553,  8, 'CBD',          0.90, 'San Manuel Silty Clay Loam',    '0-8',  'A'],
            ['New Visayas',       'Urban', 368,  18987, 3797, 5160,  5, 'Minor_Growth', 0.55, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['New Pandan',        'Urban', 138,  8550,  1710, 6196,  5, 'CBD',          0.90, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Quezon',            'Urban', 260,  6933,  1387, 2667,  5, 'Minor_Growth', 0.55, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Salvacion',         'Urban', 152,  10748, 1791, 7071,  6, 'Minor_Growth', 0.55, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['San Francisco',     'Urban', 192,  13953, 2791, 7267,  5, 'CBD',          0.90, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['San Vicente',       'Urban', 470,  19334, 4834, 4114,  4, 'Minor_Growth', 0.55, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['San Pedro',         'Urban', 224,  3408,  852,  1521,  4, 'CBD',          0.90, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['A.O. Floirendo',    'Rural', 3867, 4165,  1388, 108,   3, 'Minor_Growth', 0.55, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Datu Abdul Dadia',  'Rural', 875,  7394,  1479, 845,   5, 'Emerging',     0.30, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Buenavista',        'Rural', 411,  794,   265,  193,   3, 'Satellite',    0.10, 'Matina Clay Loam',              '18-30','B'],
            ['Cacao',             'Rural', 774,  1304,  326,  168,   4, 'Satellite',    0.10, 'Matina Clay Loam',              '0-8',  'B'],
            ['Consolacion',       'Rural', 280,  1509,  168,  539,   9, 'Satellite',    0.10, 'Matina Clay Loam',              '0-8',  'B'],
            ['Dapco',             'Rural', 934,  4199,  1050, 450,   4, 'Satellite',    0.10, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Kasilak',           'Rural', 821,  2730,  546,  333,   5, 'Satellite',    0.10, 'San Manuel Silty Clay Loam',    '0-8',  'B'],
            ['Katipunan',         'Rural', 829,  2449,  490,  295,   5, 'Satellite',    0.10, 'San Manuel Silty Clay Loam',    '0-8',  'B'],
            ['Katualan',          'Rural', 658,  606,   121,  92,    5, 'Satellite',    0.10, 'Matina Clay Loam',              '50+',  'D'],
            ['Kauswagan',         'Rural', 921,  1799,  450,  195,   4, 'Emerging',     0.30, 'Matina Clay Loam',              '0-8',  'B'],
            ['Kiotoy',            'Rural', 696,  1503,  251,  216,   6, 'Satellite',    0.10, 'Matina Clay Loam',              '0-8',  'B'],
            ['Little Panay',      'Rural', 732,  2736,  547,  374,   5, 'Satellite',    0.10, 'San Manuel Silty Clay Loam',    '0-8',  'B'],
            ['Lower Panaga',      'Rural', 1249, 1598,  533,  128,   3, 'Satellite',    0.10, 'Camasan Sandy Clay Loam',       '0-8',  'A'],
            ['Mabunao',           'Rural', 100,  2116,  705,  2116,  3, 'Emerging',     0.30, 'Matina Clay Loam',              '18-30','C'],
            ['Maduao',            'Rural', 528,  3720,  620,  705,   6, 'Satellite',    0.10, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Malativas',         'Rural', 911,  2582,  646,  283,   4, 'Emerging',     0.30, 'Matina Clay Loam',              '0-8',  'C'],
            ['Manay',             'Rural', 770,  6353,  1588, 825,   4, 'Satellite',    0.10, 'San Manuel Silty Clay Loam',    '0-8',  'A'],
            ['Nanyo',             'Rural', 582,  3979,  796,  684,   5, 'Satellite',    0.10, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['New Malaga',        'Rural', 376,  2088,  418,  555,   5, 'Satellite',    0.10, 'Matina Clay Loam',              '0-8',  'C'],
            ['New Malitbog',      'Rural', 821,  4236,  847,  516,   5, 'Satellite',    0.10, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['San Nicolas',       'Rural', 625,  2948,  737,  472,   4, 'Satellite',    0.10, 'Cabangan Clay Loam',            '0-8',  'B'],
            ['San Roque',         'Rural', 543,  656,   164,  121,   4, 'Satellite',    0.10, 'Matina Clay Loam',              '0-8',  'C'],
            ['Santa Cruz',        'Rural', 760,  1175,  294,  155,   4, 'Satellite',    0.10, 'Matina Clay Loam',              '50+',  'D'],
            ['Sindaton',          'Rural', 383,  4312,  1437, 525,   3, 'Satellite',    0.10, 'Camasan Sandy Clay Loam',       '0-8',  'A'],
            ['Southern Davao',    'Rural', 690,  9899,  1100, 1435,  9, 'Emerging',     0.30, 'Cabangan Clay Loam',            '0-8',  'A'],
            ['Tagpore',           'Rural', 616,  1773,  296,  288,   6, 'Emerging',     0.30, 'Cabangan Clay Loam',            '0-8',  'B'],
            ['Tibungol',          'Rural', 548,  2037,  509,  372,   4, 'Satellite',    0.10, 'Camasan Sandy Clay Loam',       '0-8',  'A'],
            ['Upper Licanan',     'Rural', 397,  1598,  320,  403,   5, 'Satellite',    0.10, 'Cabangan Clay Loam',            '18-30','B'],
            ['Waterfall',         'Rural', 394,  969,   242,  246,   4, 'Satellite',    0.10, 'Matina Clay Loam',              '0-8',  'C'],
        ];

        foreach ($barangays as $row) {
            ZoneUnit::create([
                'unit_name'            => $row[0],
                'unit_type'            => $row[1],
                'total_area_ha'        => $row[2],
                'population_2020'      => $row[3],
                'household_count'      => $row[4],
                'population_density'   => $row[5],
                'avg_household_size'   => $row[6],
                'settlement_tier'      => $row[7],
                'saturation_index'     => $row[8],
                'dominant_soil_type'   => $row[9],
                'dominant_slope_class' => $row[10],
                'land_capability_class'=> $row[11],
            ]);
        }
    }
}
