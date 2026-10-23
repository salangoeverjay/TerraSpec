<?php

namespace App\Http\Controllers;

use App\Models\ZoneZoningData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * Zoning query: area of chosen Integrated Zoning Map classes, per barangay, optionally
 * limited to the part under very-high flood or high landslide susceptibility (MGB 2020).
 */
class ZoningQueryController extends Controller
{
    /** @var array<string, string> */
    public const HAZARDS = [
        'any' => 'All land in the zone',
        'flood' => 'Very high flood susceptibility',
        'landslide' => 'High landslide susceptibility',
        'hazard_free' => 'Outside very high flood and high landslide areas',
    ];

    // GET /zoning/query?zones[]=PA&barangays[]=3&hazard=flood&min_area_ha=1
    public function __invoke(Request $request): JsonResponse
    {
        $labels = config('suitability.constraint_labels', []);
        $zoningCodes = array_keys(array_filter($labels, fn (string $code) => ! str_contains($code, '_'), ARRAY_FILTER_USE_KEY));

        $data = $request->validate([
            'zones' => ['nullable', 'array'],
            'zones.*' => ['string', Rule::in($zoningCodes)],
            'barangays' => ['nullable', 'array'],
            'barangays.*' => ['integer', 'exists:zone_units,zone_unit_id'],
            'hazard' => ['nullable', Rule::in(array_keys(self::HAZARDS))],
            'min_area_ha' => ['nullable', 'numeric', 'min:0'],
        ]);

        $zones = $data['zones'] ?? [];
        $barangays = $data['barangays'] ?? [];
        $hazard = $data['hazard'] ?? 'any';
        $minArea = (float) ($data['min_area_ha'] ?? 0);

        $rows = ZoneZoningData::with('zoneUnit:zone_unit_id,unit_name')
            ->where('zoning_code', '!=', 'NONE')
            ->when($zones, fn ($q) => $q->whereIn('zoning_code', $zones))
            ->when($barangays, fn ($q) => $q->whereIn('zone_unit_id', $barangays))
            ->get()
            ->map(fn (ZoneZoningData $row) => [
                'zone_unit_id' => $row->zone_unit_id,
                'barangay' => $row->zoneUnit->unit_name,
                'zone' => $row->zoning_code,
                'zone_label' => $labels[$row->zoning_code] ?? $row->zoning_code,
                'zone_area_ha' => (float) $row->area_ha,
                'flood_very_high_ha' => (float) $row->flood_very_high_ha,
                'landslide_high_ha' => (float) $row->landslide_high_ha,
                'matched_ha' => $this->matchedArea($row, $hazard),
            ])
            ->filter(fn (array $row) => $row['matched_ha'] > 0 && $row['matched_ha'] >= $minArea)
            ->sortByDesc('matched_ha')
            ->values();

        return response()->json([
            'data' => [
                'filters' => [
                    'zones' => $zones,
                    'barangays' => $barangays,
                    'hazard' => $hazard,
                    'hazard_label' => self::HAZARDS[$hazard],
                    'min_area_ha' => $minArea,
                ],
                'total_ha' => round($rows->sum('matched_ha'), 2),
                'barangay_count' => $rows->pluck('zone_unit_id')->unique()->count(),
                'by_zone' => $this->totals($rows, 'zone', fn (array $r) => ['zone' => $r['zone'], 'zone_label' => $r['zone_label']]),
                'by_barangay' => $this->totals($rows, 'zone_unit_id', fn (array $r) => ['zone_unit_id' => $r['zone_unit_id'], 'barangay' => $r['barangay']]),
                'rows' => $rows,
                'source' => 'Integrated Zoning Map C.Y. 2020-2029 (digitized) within PSA 2023 barangay boundaries; MGB 2020 flood and landslide susceptibility',
                'note' => $hazard === 'hazard_free'
                    ? 'Hazard-free area = zone area minus very high flood and high landslide areas (the two rarely overlap).'
                    : null,
            ],
        ]);
    }

    /**
     * Hectares of the zone that satisfy the hazard condition.
     */
    private function matchedArea(ZoneZoningData $row, string $hazard): float
    {
        $area = (float) $row->area_ha;
        $flood = (float) $row->flood_very_high_ha;
        $landslide = (float) $row->landslide_high_ha;

        return round(match ($hazard) {
            'flood' => $flood,
            'landslide' => $landslide,
            'hazard_free' => max(0, $area - $flood - $landslide),
            default => $area,
        }, 2);
    }

    /**
     * Matched hectares grouped by one key, largest first.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @param  callable(array<string, mixed>): array<string, mixed>  $describe
     * @return Collection<int, array<string, mixed>>
     */
    private function totals(Collection $rows, string $key, callable $describe): Collection
    {
        return $rows->groupBy($key)
            ->map(fn (Collection $group) => [
                ...$describe($group->first()),
                'matched_ha' => round($group->sum('matched_ha'), 2),
            ])
            ->sortByDesc('matched_ha')
            ->values();
    }
}
