<?php

namespace Database\Seeders;

use App\Models\ZoneUnit;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Matches barangay names in source data to zone units the same way in every seeder: case, accents,
 * spaces and punctuation are ignored ("Santo Niño" = "Santo Nino", "A. O. Floirendo" = "A.O. Floirendo"),
 * and a name that matches no zone unit stops the seeding instead of silently dropping that barangay.
 */
trait MatchesZoneUnits
{
    /** @var array<string, int>|null */
    private ?array $zoneIdsByKey = null;

    protected function nameKey(string $name): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($name)));
    }

    /**
     * @throws RuntimeException when no zone unit has this name
     */
    protected function zoneIdFor(string $name, string $source): int
    {
        $this->zoneIdsByKey ??= ZoneUnit::pluck('zone_unit_id', 'unit_name')
            ->mapWithKeys(fn (int $id, string $unitName) => [$this->nameKey($unitName) => $id])
            ->all();

        return $this->zoneIdsByKey[$this->nameKey($name)]
            ?? throw new RuntimeException("{$source}: no zone unit named '{$name}'.");
    }

    /**
     * The entry for a barangay in a data file keyed by name key (e.g. data/barangay_landslide.json).
     *
     * @param  array<string, mixed>  $entries
     *
     * @throws RuntimeException when the file has no entry for this barangay
     */
    protected function entryFor(array $entries, string $name, string $source): mixed
    {
        return $entries[$this->nameKey($name)]
            ?? throw new RuntimeException("{$source}: no entry for barangay '{$name}'.");
    }
}
