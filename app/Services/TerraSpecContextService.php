<?php

namespace App\Services;

use App\Models\EnvironmentalRestriction;
use App\Models\MangroveSpecies;
use App\Models\SuitabilityAnalysis;
use App\Models\ZoneUnit;

class TerraSpecContextService
{
    private const TYPES = ['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'];

    public function __construct(private ReforestationStudyArea $studyArea) {}

    public function build(): string
    {
        $sections = [
            $this->buildCityOverview(),
            $this->buildSuitabilityRankings(),
            $this->buildZoningByBarangay(),
            $this->buildEnvironmentalRestrictions(),
            $this->buildHazardZones(),
            $this->buildTreeSpecies(),
            $this->buildZoneElevationSalinity(),
        ];

        return implode("\n\n", array_filter($sections));
    }

    private function buildCityOverview(): string
    {
        $total = ZoneUnit::count();
        $urban = ZoneUnit::where('unit_type', 'Urban')->count();
        $rural = ZoneUnit::where('unit_type', 'Rural')->count();

        return "PANABO CITY — Land Suitability Reference Data\n"
             ."Coverage: {$total} barangays ({$urban} Urban, {$rural} Rural)\n"
             ."Method: CLUP development-constraint step, then AHP-Weighted Linear Combination (7 criteria); compared with AHP-TOPSIS, EWM-WLC and EWM-TOPSIS\n"
             ."Criteria: Flood Risk, Slope, Soil, Liquefaction, Population Density, Market Saturation, Zoning Compliance\n"
             .'Note: AHP weights are the current system weights set by the LGU; scores are decision support only.';
    }

    private function buildSuitabilityRankings(): string
    {
        $lines = [];

        // Latest stored result per barangay and land use (repeated runs are stored as new rows)
        $latestIds = SuitabilityAnalysis::query()
            ->selectRaw('MAX(analysis_id) as analysis_id')
            ->groupBy('zone_unit_id', 'analysis_type')
            ->pluck('analysis_id');

        foreach (self::TYPES as $type) {
            $rows = SuitabilityAnalysis::with('zoneUnit')
                ->whereIn('analysis_id', $latestIds)
                ->where('analysis_type', $type)
                ->when($this->studyArea->appliesTo($type), fn ($query) => $query->whereIn('zone_unit_id', $this->studyArea->zoneIds()))
                ->orderByDesc('total_score')
                ->get()
                ->values();

            if ($rows->isEmpty()) {
                continue;
            }

            $avg = round($rows->avg('total_score') * 100, 1);
            $label = strtoupper($type)." SUITABILITY (avg: {$avg}%)";
            $lines[] = "=== {$label} ===";
            if ($this->studyArea->appliesTo($type)) {
                $lines[] = $this->studyArea->description();
            }

            foreach ($rows as $i => $row) {
                $rank = $i + 1;
                $name = $row->zoneUnit->unit_name;
                $type_ = $row->zoneUnit->unit_type;
                $pct = round($row->total_score * 100, 1);
                $level = $row->suitability_level;
                $lines[] = "{$rank}. {$name} ({$type_}) — {$pct}% [{$level}]";
            }
        }

        return empty($lines)
            ? "=== SUITABILITY RANKINGS ===\nNo ranking data available. Run a suitability calculation first."
            : implode("\n", $lines);
    }

    private function buildZoningByBarangay(): string
    {
        $labels = config('suitability.constraint_labels', []);
        $zones = ZoneUnit::with('zoningData')->orderBy('unit_name')->get();

        $lines = [
            '=== ZONING CLASSES PER BARANGAY (Integrated Zoning Map 2020-2029, digitized; ha and share of zoned area) ===',
            'Where given, "VH flood" and "high landslide" are the hectares of that zoning class inside MGB 2020 very high flood or high landslide susceptibility areas. A class listed without them has none.',
        ];
        foreach ($zones as $zone) {
            $rows = $zone->zoningData->where('zoning_code', '!=', 'NONE')->sortByDesc('area_ha');
            $total = (float) $rows->sum('area_ha');
            if ($total <= 0) {
                continue;
            }
            $parts = $rows->map(function ($r) use ($labels, $total) {
                $hazards = array_filter([
                    $r->flood_very_high_ha > 0 ? 'VH flood '.number_format((float) $r->flood_very_high_ha, 1).' ha' : null,
                    $r->landslide_high_ha > 0 ? 'high landslide '.number_format((float) $r->landslide_high_ha, 1).' ha' : null,
                ]);

                return ($labels[$r->zoning_code] ?? $r->zoning_code)
                    .' '.number_format((float) $r->area_ha, 1).' ha ('.round(100 * $r->area_ha / $total).'%'
                    .($hazards ? '; '.implode(', ', $hazards) : '').')';
            });
            $lines[] = "{$zone->unit_name}: ".$parts->implode(', ');
        }

        return count($lines) > 1 ? implode("\n", $lines) : '';
    }

    private function buildEnvironmentalRestrictions(): string
    {
        $restrictions = EnvironmentalRestriction::with('zoneUnits')->get();

        if ($restrictions->isEmpty()) {
            return '';
        }

        $lines = ['=== ENVIRONMENTAL RESTRICTIONS ==='];

        foreach ($restrictions as $r) {
            $zones = $r->zoneUnits->pluck('unit_name')->sort()->implode(', ');
            $count = $r->zoneUnits->count();
            $lines[] = "[{$r->restriction_type}] {$r->restriction_name} — {$count} zone(s): {$zones}";
            $lines[] = "  Note: {$r->description}";
        }

        return implode("\n", $lines);
    }

    private function buildHazardZones(): string
    {
        $zones = ZoneUnit::with('hazardData')->orderBy('unit_name')->get();

        $lines = [
            '=== HAZARD DATA PER BARANGAY (ha) ===',
            'Flood: CLUP Table PF-19 (DENR-MGB XI 2020) High / Moderate / Low. Landslide: MGB 2020 landslide map within the PSA barangay boundary, High / Moderate. Liquefaction: CLUP Table PF-26 highly susceptible (HSA).',
            'Storm surge, drought and sea level rise per barangay are not loaded in TerraSpec yet: say so instead of guessing.',
        ];

        foreach ($zones as $z) {
            $h = $z->hazardData;
            if (! $h) {
                continue;
            }

            $f = fn ($v) => number_format((float) $v, 1);
            $lines[] = "- {$z->unit_name}: flood {$f($h->flood_high_ha)} / {$f($h->flood_moderate_ha)} / {$f($h->flood_low_ha)}; "
                ."landslide {$f($h->landslide_high_ha)} / {$f($h->landslide_moderate_ha)}; liquefaction HSA {$f($h->liquefaction_hsa_ha)}";
        }

        return implode("\n", $lines);
    }

    private function buildTreeSpecies(): string
    {
        $species = MangroveSpecies::orderBy('list_order')->get();

        if ($species->isEmpty()) {
            return '';
        }

        // The reforestation study covers mangrove sites, so only mangroves and associates are recommended
        $lines = ['=== MANGROVE SPECIES FOR REFORESTATION (true mangroves and associates only; source: '.$species->first()->source.') ==='];

        foreach (MangroveSpecies::TIDAL_ZONES as $zone => $label) {
            foreach ($species->where('tidal_zone', $zone) as $s) {
                $type = MangroveSpecies::CATEGORIES[$s->category] ?? $s->category;
                $lines[] = "{$s->local_name} ({$s->scientific_name}, {$s->family}) — {$type}, IUCN {$s->iucn_status}, {$s->habit}; zone: {$label}. {$s->zone_note}";
            }
        }
        $lines[] = 'Tidal zones follow general Philippine mangrove zonation; the tidal position of each site has not been surveyed, so do not assign species to a specific site.';

        return implode("\n", $lines);
    }

    private function buildZoneElevationSalinity(): string
    {
        $zones = ZoneUnit::whereNotNull('elevation_min')
            ->whereIn('zone_unit_id', $this->studyArea->zoneIds())
            ->orderBy('unit_name')
            ->get(['unit_name', 'unit_type', 'elevation_min', 'elevation_max', 'salinity_level']);

        if ($zones->isEmpty()) {
            return '';
        }

        $lines = ['=== BARANGAY ELEVATION & SALINITY (for tree species matching, reforestation study area only) ==='];

        foreach ($zones as $z) {
            $lines[] = "{$z->unit_name} ({$z->unit_type}): elevation {$z->elevation_min}–{$z->elevation_max}m, salinity {$z->salinity_level}";
        }

        return implode("\n", $lines);
    }
}
