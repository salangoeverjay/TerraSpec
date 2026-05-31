<?php

namespace App\Services;

use App\Models\EnvironmentalRestriction;
use App\Models\SuitabilityAnalysis;
use App\Models\TreeSpecies;
use App\Models\ZoneUnit;

class TerraSpecContextService
{
    private const TYPES = ['commercial', 'residential', 'industrial', 'reforestation'];

    public function build(): string
    {
        $sections = [
            $this->buildCityOverview(),
            $this->buildSuitabilityRankings(),
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
             . "Coverage: {$total} barangays ({$urban} Urban, {$rural} Rural)\n"
             . "Method: AHP-Weighted Linear Combination (7 criteria)\n"
             . "Criteria: Flood Risk, Slope, Soil, Liquefaction, Population Density, Market Saturation, Zoning Compliance";
    }

    private function buildSuitabilityRankings(): string
    {
        $lines = [];

        foreach (self::TYPES as $type) {
            $rows = SuitabilityAnalysis::with('zoneUnit')
                ->where('analysis_type', $type)
                ->orderByDesc('total_score')
                ->get();

            if ($rows->isEmpty()) {
                continue;
            }

            $avg = round($rows->avg('total_score') * 100, 1);
            $label = strtoupper($type) . " SUITABILITY (avg: {$avg}%)";
            $lines[] = "=== {$label} ===";

            foreach ($rows as $i => $row) {
                $rank  = $i + 1;
                $name  = $row->zoneUnit->unit_name;
                $type_ = $row->zoneUnit->unit_type;
                $pct   = round($row->total_score * 100, 1);
                $level = $row->suitability_level;
                $lines[] = "{$rank}. {$name} ({$type_}) — {$pct}% [{$level}]";
            }
        }

        return empty($lines)
            ? "=== SUITABILITY RANKINGS ===\nNo ranking data available. Run a suitability calculation first."
            : implode("\n", $lines);
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

        $floodLines   = ['--- High Flood Risk Zones ---'];
        $hazardLines  = ['--- Multi-Hazard Zones ---'];
        $hasFlood     = false;
        $hasHazard    = false;

        foreach ($zones as $z) {
            $h = $z->hazardData;
            if (! $h) {
                continue;
            }

            if ($h->flood_high_ha > 0) {
                $hasFlood  = true;
                $ha        = number_format((float) $h->flood_high_ha, 1);
                $risk      = $h->flood_high_ha >= 100 ? 'Critical' : 'Elevated';
                $floodLines[] = "- {$z->unit_name}: {$ha} ha [{$risk}]";
            }

            $flags = [];
            if ($h->has_flood)          $flags[] = 'Flood';
            if ($h->has_landslide)      $flags[] = 'Landslide';
            if ($h->has_storm_surge)    $flags[] = 'Storm Surge';
            if ($h->has_drought)        $flags[] = 'Drought';
            if ($h->has_sea_level_rise) $flags[] = 'Sea Level Rise';

            if (! empty($flags)) {
                $hasHazard    = true;
                $flagStr      = implode(', ', $flags);
                $hazardLines[] = "- {$z->unit_name}: {$flagStr}";
            }
        }

        $sections = ['=== HAZARD DATA ==='];
        if ($hasFlood)  $sections = array_merge($sections, $floodLines);
        if ($hasHazard) $sections = array_merge($sections, [''], $hazardLines);

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
            ->orderBy('unit_name')
            ->get(['unit_name', 'unit_type', 'elevation_min', 'elevation_max', 'salinity_level']);

        if ($zones->isEmpty()) {
            return '';
        }

        $lines = ['=== BARANGAY ELEVATION & SALINITY (for tree species matching) ==='];

        foreach ($zones as $z) {
            $lines[] = "{$z->unit_name} ({$z->unit_type}): elevation {$z->elevation_min}–{$z->elevation_max}m, salinity {$z->salinity_level}";
        }

        return implode("\n", $lines);
    }
}
