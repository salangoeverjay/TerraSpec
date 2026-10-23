<?php

namespace App\Services;

use App\Models\ReforestationSite;
use App\Models\ZoneUnit;
use Illuminate\Support\Collection;

/**
 * Compares TerraSpec's reforestation results with the actual mangrove reforestation sites:
 * zoning agreement and how the terrestrial AHP-WLC model treats the sites.
 */
class ReforestationSiteValidationService
{
    public function __construct(
        private SuitabilityScoreService $scorer,
    ) {}

    /**
     * @return array{summary: array<string, mixed>, sites: array<int, array<string, mixed>>, checks: array<string, array<string, mixed>>}
     */
    public function validate(): array
    {
        $sites = ReforestationSite::with('zoneUnit')->orderBy('id')->get();
        $barangays = $sites->pluck('zoneUnit')->unique('zone_unit_id')
            ->mapWithKeys(fn (ZoneUnit $zone) => [$zone->zone_unit_id => $this->assessBarangay($zone)]);

        $rows = $sites->map(fn (ReforestationSite $site) => [
            'id' => $site->id,
            'name' => $site->name,
            'status' => $site->status,
            'year' => $site->year,
            'adopter' => $site->adopter,
            'area_ha' => $site->area_ha,
            'barangay' => $site->zoneUnit->unit_name,
            'zone_unit_id' => $site->zone_unit_id,
            'mangrove_zone_share' => $site->mangrove_zone_share,
            'other_zone_share' => $site->other_zone_share,
            'unzoned_share' => $site->unzoned_share,
            'zoning_agrees' => $site->other_zone_share < 0.05,
            ...$barangays[$site->zone_unit_id],
        ])->values();

        return [
            'summary' => $this->summary($sites),
            'sites' => $rows->all(),
            'checks' => $this->checks($rows),
        ];
    }

    /**
     * Terrestrial AHP-WLC result for the barangay.
     *
     * @return array<string, mixed>
     */
    private function assessBarangay(ZoneUnit $zone): array
    {
        $result = $this->scorer->calculate($zone, 'reforestation');

        return [
            'terrestrial_pct' => $result['total_pct'],
            'terrestrial_level' => $result['suitability_level'],
            'terrestrial_excluded' => (bool) ($result['constraint']['excluded'] ?? false),
        ];
    }

    /**
     * @param  Collection<int, ReforestationSite>  $sites
     * @return array<string, mixed>
     */
    private function summary(Collection $sites): array
    {
        return [
            'site_count' => $sites->count(),
            'total_ha' => round($sites->sum('area_ha'), 2),
            'by_status' => collect(ReforestationSite::STATUSES)->mapWithKeys(fn (string $status) => [$status => [
                'count' => $sites->where('status', $status)->count(),
                'area_ha' => round($sites->where('status', $status)->sum('area_ha'), 2),
            ]])->all(),
            'by_barangay' => $sites->groupBy(fn (ReforestationSite $s) => $s->zoneUnit->unit_name)
                ->map(fn (Collection $group, string $name) => [
                    'barangay' => $name,
                    'count' => $group->count(),
                    'area_ha' => round($group->sum('area_ha'), 2),
                ])->values()->all(),
            'source' => 'Mangrove Reforestation and Rehabilitation (KML); barangay = containing or nearest PSA 2023 boundary',
        ];
    }

    /**
     * Area-weighted agreement of TerraSpec's results with the actual sites.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array<string, array<string, mixed>>
     */
    private function checks(Collection $rows): array
    {
        $total = max($rows->sum('area_ha'), 0.0001);
        $share = fn (callable $test) => round($rows->filter($test)->sum('area_ha') / $total, 4);

        $zoning = $share(fn (array $r) => $r['zoning_agrees']);
        $excluded = $share(fn (array $r) => $r['terrestrial_excluded']);
        $inMangroveZone = round($rows->sum(fn (array $r) => $r['area_ha'] * $r['mangrove_zone_share']) / $total, 4);
        $seaward = round($rows->sum(fn (array $r) => $r['area_ha'] * $r['unzoned_share']) / $total, 4);

        return [
            'zoning' => [
                'label' => 'Zoning agreement',
                'agreement' => $zoning,
                'detail' => sprintf('%.0f%% of the site area is in the Mangrove sub-zone and %.0f%% is seaward of the zoning map (intertidal); %.0f%% falls in other land-use zones.', $inMangroveZone * 100, $seaward * 100, max(1 - $inMangroveZone - $seaward, 0) * 100),
            ],
            'terrestrial' => [
                'label' => 'Terrestrial AHP-WLC model',
                'agreement' => null,
                'excluded_share' => $excluded,
                'detail' => sprintf('%.0f%% of the site area is in barangays the terrestrial reforestation model excludes, because their land is mostly mangrove or built-up zones. This is by design (mangroves are assessed separately), so the AHP-WLC score cannot rank mangrove sites; mangrove species are recommended by tidal zone instead.', $excluded * 100),
            ],
        ];
    }
}
