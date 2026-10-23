<?php

namespace App\Services;

use App\Models\EnvironmentalRestriction;
use App\Models\SuitabilityAnalysis;
use App\Models\TreeSpecies;
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

        $lines = ['=== ZONING CLASSES PER BARANGAY (Integrated Zoning Map 2020-2029, digitized; ha and share of zoned area) ==='];
        foreach ($zones as $zone) {
            $rows = $zone->zoningData->where('zoning_code', '!=', 'NONE')->sortByDesc('area_ha');
            $total = (float) $rows->sum('area_ha');
            if ($total <= 0) {
                continue;
            }
            $parts = $rows->take(6)->map(fn ($r) => ($labels[$r->zoning_code] ?? $r->zoning_code)
                .' '.number_format((float) $r->area_ha, 1).' ha ('.round(100 * $r->area_ha / $total).'%)');
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
        $zones = ZoneUnit::with('hazardData')->get();

        $floodLines = ['--- High Flood Risk Zones ---'];
        $hazardLines = ['--- Multi-Hazard Zones ---'];
        $hasFlood = false;
        $hasHazard = false;

        foreach ($zones as $z) {
            $h = $z->hazardData;
            if (! $h) {
                continue;
            }

            if ($h->flood_high_ha > 0) {
                $hasFlood = true;
                $ha = number_format((float) $h->flood_high_ha, 1);
                $risk = $h->flood_high_ha >= 100 ? 'Critical' : 'Elevated';
                $floodLines[] = "- {$z->unit_name}: {$ha} ha [{$risk}]";
            }

            $flags = [];
            if ($h->has_flood) {
                $flags[] = 'Flood';
            }
            if ($h->has_landslide) {
                $flags[] = 'Landslide';
            }
            if ($h->has_storm_surge) {
                $flags[] = 'Storm Surge';
            }
            if ($h->has_drought) {
                $flags[] = 'Drought';
            }
            if ($h->has_sea_level_rise) {
                $flags[] = 'Sea Level Rise';
            }

            if (! empty($flags)) {
                $hasHazard = true;
                $flagStr = implode(', ', $flags);
                $hazardLines[] = "- {$z->unit_name}: {$flagStr}";
            }
        }

        $sections = ['=== HAZARD DATA ==='];
        if ($hasFlood) {
            $sections = array_merge($sections, $floodLines);
        }
        if ($hasHazard) {
            $sections = array_merge($sections, [''], $hazardLines);
        }

        return implode("\n", $sections);
    }

    private function buildTreeSpecies(): string
    {
        $species = TreeSpecies::all();

        if ($species->isEmpty()) {
            return '';
        }

        $lines = ['=== TREE SPECIES FOR REFORESTATION ==='];

        foreach ($species as $s) {
            $lines[] = "{$s->common_name} ({$s->scientific_name})";
            $lines[] = "  Soil: {$s->soil_preference} | Elevation: {$s->elevation_range}m | Salinity: {$s->salinity_level} | Temp: {$s->temperature_range}°C";
            $lines[] = "  Notes: {$s->suitability_notes}";
        }

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
