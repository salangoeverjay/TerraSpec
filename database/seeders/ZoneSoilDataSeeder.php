<?php

namespace Database\Seeders;

use App\Models\ZoneSoilData;
use Illuminate\Database\Seeder;

/**
 * Soil type hectares per barangay from CLUP Panabo City 2020-2029 Table PF-9 (p.63-64; source BSWM 2019).
 * Dalisay in the CLUP is New Malaga in TerraSpec. The four types total 25,123.2 ha (city total 25,123 ha).
 */
class ZoneSoilDataSeeder extends Seeder
{
    use MatchesZoneUnits;

    public function run(): void
    {
        // [barangay, Cabangan Clay Loam, Camasan Sandy Clay Loam, Matina Clay Loam, San Manuel Silty Clay Loam]
        $soil = [
            ['A.O. Floirendo',     1872.4,    258.6,    240.3,    846.5],
            ['Buenavista',          110.8,      0.0,    461.5,      0.0],
            ['Cacao',                28.3,      0.0,    524.2,     46.6],
            ['Cagangohan',          353.0,      0.0,      0.0,      3.2],
            ['Consolacion',           0.0,      0.0,    410.5,      0.0],
            ['Dapco',               899.1,      0.0,      0.0,      0.0],
            ['Datu Abdul Dadia',    326.8,      0.0,      0.0,    258.0],
            ['Gredu',               131.1,      0.0,      0.0,      0.0],
            ['J.P. Laurel',         184.5,      0.0,      0.0,    367.1],
            ['Kasilak',               0.0,      0.0,    597.6,    336.3],
            ['Katipunan',           387.0,      0.0,      9.8,    570.7],
            ['Katualan',              0.0,      0.0,    432.8,      0.0],
            ['Kauswagan',             0.0,      0.0,    761.3,      0.0],
            ['Kiotoy',              208.4,      0.0,    490.0,      0.0],
            ['Little Panay',         47.5,      0.0,      0.0,    588.1],
            ['Lower Panaga',          0.0,    369.4,      0.0,      0.0],
            ['Mabunao',               0.0,      0.0,   1030.1,      0.0],
            ['Maduao',              340.9,      0.0,      0.0,     11.8],
            ['Malativas',             0.0,      0.0,    952.9,      0.0],
            ['Manay',                84.5,      0.0,    327.6,    832.5],
            ['Nanyo',               518.6,      0.0,      0.0,    117.8],
            ['New Malaga',            0.0,      0.0,    536.5,      0.0],
            ['New Malitbog',        241.8,      0.0,      0.0,    227.5],
            ['New Pandan',          159.1,      0.0,      0.0,      0.0],
            ['New Visayas',         382.6,      0.0,      0.0,      0.0],
            ['Quezon',              310.8,      0.0,      0.0,      0.0],
            ['Salvacion',           199.8,      0.0,      0.0,      0.0],
            ['San Francisco',       196.6,      0.0,      0.0,      0.0],
            ['San Nicolas',         590.9,      0.0,     76.7,      0.0],
            ['San Pedro',           283.0,      0.0,      0.0,      0.0],
            ['San Roque',             0.0,      0.0,    256.7,      0.0],
            ['San Vicente',         486.2,      0.0,      0.0,      0.0],
            ['Santa Cruz',           17.7,      0.0,    999.1,      0.0],
            ['Santo Nino',          119.8,      0.0,      0.0,      0.0],
            ['Sindaton',              2.3,    793.6,      0.0,      0.0],
            ['Southern Davao',      489.1,      0.0,      0.0,      0.0],
            ['Tagpore',             643.6,      0.0,      0.0,      0.0],
            ['Tibungol',            192.3,    402.0,      0.0,    359.8],
            ['Upper Licanan',       324.8,      0.0,     59.8,      0.0],
            ['Waterfall',             0.0,      0.0,    433.0,      0.0],
        ];

        ZoneSoilData::query()->delete();

        foreach ($soil as [$name, $cabangan, $camasan, $matina, $sanManuel]) {
            ZoneSoilData::create([
                'zone_unit_id' => $this->zoneIdFor($name, 'CLUP soil table'),
                'cabangan_clay_loam_ha' => $cabangan,
                'camasan_sandy_clay_loam_ha' => $camasan,
                'matina_clay_loam_ha' => $matina,
                'san_manuel_silty_clay_loam_ha' => $sanManuel,
            ]);
        }
    }
}
