<?php

namespace App\Services;

use App\Models\EnvironmentalRestriction;
use App\Models\MangroveSpecies;
use App\Models\SuitabilityCriteria;
use App\Models\ZoneUnit;
use App\Models\ZoneZoningData;

class TerraSpecContextService
{
    private const TYPES = ['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'];

    public function __construct(
        private ReforestationStudyArea $studyArea,
        private SuitabilityScoreService $scorer,
    ) {}

    public function build(): string
    {
        $sections = [
            $this->buildCityOverview(),
            $this->buildCriteriaWeights(),
            $this->buildAllowedUses(),
            $this->buildPrincipalZoneLand(),
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
             .'Note: the scores below are computed live from the current AHP weights set by the LGU; they are decision support only.';
    }

    /**
     * The AHP weights the LGU has set, the same ones every score on screen uses.
     */
    private function buildCriteriaWeights(): string
    {
        $criteria = SuitabilityCriteria::orderBy('criteria_id')->get();

        if ($criteria->isEmpty()) {
            return '';
        }

        $lines = ['=== CURRENT AHP CRITERIA WEIGHTS (set by the LGU in Admin; the weights of each land use sum to 100%) ==='];
        foreach (self::TYPES as $type) {
            $weights = $criteria->map(fn (SuitabilityCriteria $c) => $c->criteria_name.' '.round($c->getWeightForType($type) * 100).'%');
            $lines[] = ucfirst($type).': '.$weights->implode(', ');
        }

        return implode("\n", $lines);
    }

    /**
     * Which zoning classes TerraSpec treats as allowing each use (its zoning-compliance values) and which
     * it removes before scoring, plus the kinds of building that belong to each use.
     */
    private function buildAllowedUses(): string
    {
        $labels = config('suitability.constraint_labels', []);
        $label = fn (string $code) => $labels[$code] ?? $code;

        $lines = [
            '=== WHAT TERRASPEC ALLOWS WHERE (provisional: based on the HLURB model zoning ordinance, NOT the Panabo Zoning Ordinance text) ===',
            'Kinds of building and the TerraSpec land use they fall under:',
            '- houses, subdivisions and apartments: residential',
            '- stores, malls, markets, restaurants, hotels and offices: commercial',
            '- factories, warehouses and storage: industrial',
            '- farms and plantations: agricultural',
            '- tree planting: reforestation (mangrove sites)',
            '- schools, hospitals and government buildings: General Institutional zone (TerraSpec has no institutional suitability score)',
            '- resorts and tourism businesses: Tourism zone (TerraSpec has no tourism suitability score)',
            'TerraSpec has no partly-compatible values for institutional or tourism use: do not say they fit any zone other than their own.',
            'Zoning compliance per use (1.0 = principal use; lower = partly compatible; a zone not listed scores 0):',
        ];

        foreach (config('suitability.zoning_compatibility', []) as $type => $values) {
            $principal = collect($values)->filter(fn ($v) => $v >= 1.0)->keys()->map($label)->implode(', ');
            $partial = collect($values)->filter(fn ($v) => $v < 1.0)->map(fn ($v, $code) => $label($code).' '.$v)->implode(', ');
            $lines[] = '- '.ucfirst($type).": principal in {$principal}".($partial !== '' ? "; partly compatible: {$partial}" : '');
        }

        $lines[] = 'Land removed before scoring (development constraints, CLUP 2020-2029):';
        foreach (config('suitability.constraints', []) as $type => $rule) {
            $excluded = array_map($label, $rule['zoning'] ?? []);
            if ($rule['flood_very_high'] ?? false) {
                $excluded[] = 'very high flood land';
            }
            if ($rule['landslide_high'] ?? false) {
                $excluded[] = 'high landslide land';
            }
            $lines[] = "- excluded for {$type}: ".implode(', ', $excluded);
        }

        return implode("\n", $lines);
    }

    /**
     * For each kind of building, the barangays with the most land in its principal zones, and how much of
     * that land lies outside very high flood and high landslide areas (MGB 2020).
     */
    private function buildPrincipalZoneLand(): string
    {
        $uses = [
            'Residential (houses)' => ['GR', 'R-1'],
            'Commercial (stores, malls, offices)' => ['C', 'GC'],
            'Industrial (factories, warehouses)' => ['I'],
            'Institutional (schools, hospitals, government)' => ['INS'],
            'Tourism (resorts)' => ['TZ'],
        ];
        $labels = config('suitability.constraint_labels', []);
        $rows = ZoneZoningData::with('zoneUnit:zone_unit_id,unit_name')->get();

        if ($rows->isEmpty()) {
            return '';
        }

        $lines = [
            '=== LAND IN EACH USE\'S PRINCIPAL ZONES, PER BARANGAY (top 8 by land outside very high flood and high landslide; digitized Integrated Zoning Map 2020-2029 and MGB 2020 hazard maps) ===',
        ];

        foreach ($uses as $use => $codes) {
            $perBarangay = $rows->whereIn('zoning_code', $codes)
                ->groupBy('zone_unit_id')
                ->map(fn ($group) => [
                    'name' => $group->first()->zoneUnit->unit_name,
                    'zoned' => (float) $group->sum('area_ha'),
                    'safe' => (float) $group->sum(fn ($r) => max(0, $r->area_ha - $r->flood_very_high_ha - $r->landslide_high_ha)),
                ])
                ->sortByDesc('safe');

            if ($perBarangay->isEmpty()) {
                continue;
            }

            $zoneNames = implode(' + ', array_map(fn ($code) => $labels[$code] ?? $code, $codes));
            $lines[] = "{$use}, zones {$zoneNames}: city total ".number_format($perBarangay->sum('zoned'), 1).' ha zoned, '
                .number_format($perBarangay->sum('safe'), 1).' ha outside very high flood and high landslide';
            foreach ($perBarangay->take(8) as $b) {
                $lines[] = "- {$b['name']}: ".number_format($b['zoned'], 1).' ha zoned, '.number_format($b['safe'], 1).' ha outside very high flood and high landslide';
            }
        }

        return implode("\n", $lines);
    }

    private function buildSuitabilityRankings(): string
    {
        $lines = [];

        // Computed live from the current weights, the same scores the rankings page shows
        foreach (self::TYPES as $type) {
            $results = $this->scorer->calculateAll($type);

            if ($results->isEmpty()) {
                continue;
            }

            $avg = round($results->avg('total_score') * 100, 1);
            $label = strtoupper($type)." SUITABILITY (avg: {$avg}%)";
            $lines[] = "=== {$label} ===";
            if ($this->studyArea->appliesTo($type)) {
                $lines[] = $this->studyArea->description();
            }

            foreach ($results as $result) {
                $lines[] = "{$result['rank']}. {$result['zone']->unit_name} ({$result['zone']->unit_type}) — {$result['total_pct']}% [{$result['suitability_level']}]";
            }
        }

        return empty($lines)
            ? "=== SUITABILITY RANKINGS ===\nNo ranking data available."
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
