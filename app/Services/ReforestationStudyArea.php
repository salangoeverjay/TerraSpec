<?php

namespace App\Services;

use App\Models\ZoneUnit;
use Illuminate\Support\Collection;

/**
 * The reforestation study area: only the barangays with at least one verified reforestation or
 * mangrove site. Other barangays are left out of the reforestation analysis, map, AI context and
 * reports (their data is kept, not deleted). Other land uses still cover every barangay.
 */
class ReforestationStudyArea
{
    public const ANALYSIS_TYPE = 'reforestation';

    /** @var Collection<int, ZoneUnit>|null */
    private ?Collection $zones = null;

    public function appliesTo(?string $analysisType): bool
    {
        return $analysisType === self::ANALYSIS_TYPE;
    }

    /**
     * @return Collection<int, ZoneUnit>
     */
    public function zones(): Collection
    {
        return $this->zones ??= ZoneUnit::whereHas('reforestationSites')->orderBy('unit_name')->get();
    }

    /**
     * @return array<int, int>
     */
    public function zoneIds(): array
    {
        return $this->zones()->pluck('zone_unit_id')->all();
    }

    /**
     * @return array<int, string>
     */
    public function names(): array
    {
        return $this->zones()->pluck('unit_name')->all();
    }

    public function contains(int $zoneUnitId): bool
    {
        return in_array($zoneUnitId, $this->zoneIds(), true);
    }

    /**
     * Whether a barangay is part of the analysis for this land use (always true except reforestation).
     */
    public function includes(?string $analysisType, int $zoneUnitId): bool
    {
        return ! $this->appliesTo($analysisType) || $this->contains($zoneUnitId);
    }

    public function description(): string
    {
        $names = $this->names();

        return $names === []
            ? 'No barangay has a verified reforestation or mangrove site yet.'
            : 'Reforestation study area: '.implode(' and ', $names).' (barangays with verified reforestation or mangrove sites). Other barangays are not part of the reforestation study.';
    }
}
