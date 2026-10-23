<?php

namespace App\Services;

use App\Models\MangroveSpecies;
use App\Models\ZoneUnit;
use Illuminate\Support\Collection;

/**
 * Mangrove species to plant in the reforestation study area: only true mangroves and mangrove
 * associates (no terrestrial trees), grouped by the tidal zone where each is generally planted.
 *
 * No per-site scores are produced: the sites' tidal position, substrate and salinity have not been
 * surveyed, so each site's zone (and therefore its species) must be confirmed in the field.
 */
class MangroveRecommendationService
{
    public const PLANTING_RULES = [
        'Plant each species only in its tidal zone; choose the zone from where the site floods at high and low tide.',
        'Do not plant Bakauan (Rhizophora) on exposed seaward fronts or open mudflats: seaward planting is where most mangrove projects fail. Use Miapi, Api-api or Pagatpat there.',
        'Plant Nypa and Padada only on brackish river banks with freshwater input, not on open saline flats.',
        'Plant associates (Malubago, Talisay, Apatot, Mangrove trumpet tree, Dungon-late) only on the back mangrove and beach margin, above most tides.',
        'Do not plant on seagrass beds or on mudflats that never supported mangroves; confirm past mangrove cover first.',
        'Mix species of the same zone instead of planting a single species.',
    ];

    public const SITE_DATA_NEEDED = [
        'Tidal position of each site (seaward, middle, landward or riverine), from high and low tide observation',
        'Substrate at each site (sandy, sandy mud, soft deep mud, firm), from a hand texture test',
        'Water salinity at each site (ppt), from a refractometer reading',
        'Past mangrove cover at each site (old imagery or local knowledge)',
    ];

    /**
     * @return array<string, mixed>
     */
    public function forZone(ZoneUnit $zone): array
    {
        $species = MangroveSpecies::orderBy('list_order')->get();

        return [
            'barangay' => $zone->unit_name,
            'zones' => $this->byZone($species),
            'species' => $species->map(fn (MangroveSpecies $s) => $this->speciesRow($s))->values()->all(),
            'conservation_priority' => $species
                ->filter(fn (MangroveSpecies $s) => in_array($s->iucn_status, ['Vulnerable', 'Near threatened', 'Endangered', 'Critically endangered'], true))
                ->map(fn (MangroveSpecies $s) => $this->speciesRow($s))->values()->all(),
            'adjacent_soil' => [
                'dominant' => $zone->dominant_soil_type,
                'note' => 'Soil series of the adjacent land (CLUP Table PF-9 / Map PF-7), not the tidal substrate of the sites.',
            ],
            'planting_rules' => self::PLANTING_RULES,
            'site_data_needed' => self::SITE_DATA_NEEDED,
            'source' => $species->first()?->source,
            'zonation_note' => 'Tidal zones follow general Philippine mangrove zonation (e.g. Primavera et al., 2004); confirm each site\'s zone in the field.',
        ];
    }

    /**
     * @param  Collection<int, MangroveSpecies>  $species
     * @return array<int, array<string, mixed>>
     */
    private function byZone(Collection $species): array
    {
        return collect(MangroveSpecies::TIDAL_ZONES)
            ->map(fn (string $label, string $key) => [
                'key' => $key,
                'label' => $label,
                'species' => $species->where('tidal_zone', $key)->map(fn (MangroveSpecies $s) => $this->speciesRow($s))->values()->all(),
            ])
            ->filter(fn (array $group) => $group['species'] !== [])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function speciesRow(MangroveSpecies $species): array
    {
        return [
            'id' => $species->id,
            'local_name' => $species->local_name,
            'scientific_name' => $species->scientific_name,
            'family' => $species->family,
            'category' => $species->category,
            'category_label' => MangroveSpecies::CATEGORIES[$species->category] ?? $species->category,
            'iucn_status' => $species->iucn_status,
            'habit' => $species->habit,
            'tidal_zone' => $species->tidal_zone,
            'tidal_zone_label' => MangroveSpecies::TIDAL_ZONES[$species->tidal_zone] ?? $species->tidal_zone,
            'zone_note' => $species->zone_note,
        ];
    }
}
