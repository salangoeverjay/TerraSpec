<?php

namespace Database\Seeders;

use App\Models\EnvironmentalRestriction;
use App\Models\ReforestationSite;
use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Environmental restrictions built only from verified data:
 *  - the protected and regulated sub-zones of the Integrated Zoning Map 2020-2029 (digitized; barangays
 *    with at least 1 ha of the sub-zone, so digitizing slivers are not counted). For the Mangrove sub-zone only
 *    compact pieces count (data/barangay_mangrove_subzone.json): the thin strips elsewhere are mostly creeks and
 *    roads misread as mangrove when the map image was classified, and need checking against the map, and
 *  - the verified mangrove reforestation sites (Mangrove Reforestation and Rehabilitation KML).
 * Run after ZoneZoningDataSeeder and ReforestationSiteSeeder.
 */
class EnvironmentalRestrictionSeeder extends Seeder
{
    private const MIN_AREA_HA = 1.0;

    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        DB::table('zone_restrictions')->truncate();
        EnvironmentalRestriction::truncate();
        Schema::enableForeignKeyConstraints();

        $subZones = [
            'MG' => ['Mangrove Sub-Zone', 'Mangrove', 'Mangrove sub-zone of the Integrated Zoning Map 2020-2029. Protected coastal mangrove forest: development is not allowed; mangrove rehabilitation only.'],
            'FR' => ['Forest Reserve Sub-Zone', 'Forest', 'Forest reserve sub-zone of the Integrated Zoning Map 2020-2029. Protected: development is not allowed; reforestation with native species.'],
            'BG' => ['Buffer / Greenbelt Zone', 'Buffer', 'Buffer and greenbelt zone of the Integrated Zoning Map 2020-2029. Kept open as a buffer: structures are limited.'],
            'PA' => ['Production Agricultural Sub-Zone (SAFDZ)', 'SAFDZ', 'Production agricultural sub-zone of the Integrated Zoning Map 2020-2029, part of the Strategic Agriculture and Fisheries Development Zones (13,998.66 ha, CLUP Table LW-2). Conversion to other uses is restricted.'],
        ];

        foreach ($subZones as $code => [$name, $type, $description]) {
            if ($code === 'MG') {
                [$ids, $area] = $this->compactMangrove();
                $this->create($name, $type, "{$description} ".number_format($area, 1).' ha of compact mangrove sub-zone in '.count($ids).' barangay(s).', $ids);

                continue;
            }

            $rows = ZoneZoningData::where('zoning_code', $code)->where('area_ha', '>=', self::MIN_AREA_HA)->get();
            $total = number_format((float) $rows->sum('area_ha'), 1);

            $this->create($name, $type, "{$description} {$total} ha in {$rows->count()} barangays (at least 1 ha each).", $rows->pluck('zone_unit_id')->unique()->all());
        }

        $sites = ReforestationSite::all();
        if ($sites->isNotEmpty()) {
            $planted = $sites->whereIn('status', ReforestationSite::PLANTED_STATUSES);

            $this->create(
                'Mangrove Reforestation Sites',
                'Mangrove site',
                sprintf(
                    '%d mapped mangrove sites (%s ha) from the Mangrove Reforestation and Rehabilitation KML: %d rehabilitated or adopted (%s ha verified planted) and %d proposed. Keep free of development.',
                    $sites->count(),
                    number_format($sites->sum('area_ha'), 2),
                    $planted->count(),
                    number_format($planted->sum('area_ha'), 2),
                    $sites->count() - $planted->count(),
                ),
                $sites->pluck('zone_unit_id')->unique()->all(),
            );
        }
    }

    /**
     * Barangays with compact Mangrove sub-zone pieces (>= 1 ha in total) and that area.
     *
     * @return array{0: array<int, int>, 1: float}
     */
    private function compactMangrove(): array
    {
        $data = json_decode(file_get_contents(database_path('seeders/data/barangay_mangrove_subzone.json')), true)['barangays'];
        $ids = [];
        $area = 0.0;

        foreach (ZoneUnit::all() as $zone) {
            $compact = (float) ($data[preg_replace('/[^a-z0-9]/', '', strtolower($zone->unit_name))]['compact_ha'] ?? 0);
            if ($compact >= self::MIN_AREA_HA) {
                $ids[] = $zone->zone_unit_id;
                $area += $compact;
            }
        }

        return [$ids, $area];
    }

    /**
     * @param  array<int, int>  $zoneUnitIds
     */
    private function create(string $name, string $type, string $description, array $zoneUnitIds): void
    {
        $restriction = EnvironmentalRestriction::create([
            'restriction_name' => $name,
            'restriction_type' => $type,
            'description' => $description,
        ]);

        foreach ($zoneUnitIds as $zoneUnitId) {
            DB::table('zone_restrictions')->insert([
                'restriction_id' => $restriction->restriction_id,
                'zone_unit_id' => $zoneUnitId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
