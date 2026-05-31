<?php

namespace App\Services;

use App\Models\EnvironmentalRestriction;
use App\Models\TreeSpecies;
use App\Models\ZoneUnit;
use Illuminate\Support\Collection;

class ReforestationService
{
    private const CITY_TEMP_MIN = 27.20;
    private const CITY_TEMP_MAX = 28.30;

    // Which species soil preferences are compatible with each zone soil type.
    // Cabangan Clay Loam includes coastal variants because several Cabangan-soil
    // barangays (Cagangohan, San Pedro, San Vicente, etc.) have tidal/mudflat
    // fringes that support mangrove and brackish species.
    private array $soilCompatibility = [
        'Cabangan Clay Loam' => [
            'Sandy loam / upland',
            'Well-drained loam',
            'Deep loam / clay',
            'Silty clay / mudflat',
            'Sandy / muddy',
            'Alluvial / brackish',
        ],
        'Camasan Sandy Clay Loam' => [
            'Sandy / muddy',
            'Well-drained loam',
            'Sandy loam / upland',
        ],
        'Matina Clay Loam' => [
            'Clay / loam',
            'Alluvial / brackish',
            'Deep loam / clay',
            'Silty clay / mudflat',
        ],
        'San Manuel Silty Clay Loam' => [
            'Silty clay / mudflat',
            'Clay / loam',
            'Alluvial / brackish',
        ],
    ];

    public function matchSpecies(ZoneUnit $zone): array
    {
        $allSpecies = TreeSpecies::orderBy('species_id')->get();
        $compatible = $this->soilCompatibility[$zone->dominant_soil_type] ?? [];
        $results    = [];

        foreach ($allSpecies as $sp) {
            $soilScore  = in_array($sp->soil_preference, $compatible) ? 0.35 : 0.0;

            [$spElevMin, $spElevMax] = $this->parseRange($sp->elevation_range);
            $elevScore = $this->rangesOverlap(
                $spElevMin, $spElevMax,
                (float) $zone->elevation_min, (float) $zone->elevation_max
            ) ? 0.25 : 0.0;

            $salScore = $this->salinityMatches($sp->salinity_level, $zone->salinity_level) ? 0.20 : 0.0;

            [$spTempMin, $spTempMax] = $this->parseRange($sp->temperature_range);
            $tempScore = $this->rangesOverlap(
                $spTempMin, $spTempMax,
                self::CITY_TEMP_MIN, self::CITY_TEMP_MAX
            ) ? 0.20 : 0.0;

            $total = $soilScore + $elevScore + $salScore + $tempScore;

            if ($total <= 0.0) {
                continue;
            }

            $results[] = [
                'species_id'        => $sp->species_id,
                'common_name'       => $sp->common_name,
                'scientific_name'   => $sp->scientific_name,
                'soil_preference'   => $sp->soil_preference,
                'elevation_range'   => $sp->elevation_range,
                'temperature_range' => $sp->temperature_range,
                'salinity_level'    => $sp->salinity_level,
                'suitability_notes' => $sp->suitability_notes,
                'score'             => round($total, 2),
                'score_pct'         => (int) round($total * 100),
                'criteria'          => [
                    'soil'        => $soilScore,
                    'elevation'   => $elevScore,
                    'salinity'    => $salScore,
                    'temperature' => $tempScore,
                ],
            ];
        }

        // Sort descending by score; use species_id as stable tiebreaker
        usort($results, fn ($a, $b) =>
            $b['score'] <=> $a['score'] ?: $a['species_id'] <=> $b['species_id']
        );

        foreach ($results as $i => &$row) {
            $row['rank'] = $i + 1;
        }

        return $results;
    }

    public function checkRestrictions(ZoneUnit $zone): Collection
    {
        return $zone->restrictions()->get([
            'environmental_restrictions.restriction_id',
            'environmental_restrictions.restriction_name',
            'environmental_restrictions.restriction_type',
            'environmental_restrictions.description',
        ]);
    }

    private function parseRange(string $range): array
    {
        $parts = array_map('floatval', explode('-', $range));
        return [$parts[0], $parts[1] ?? $parts[0]];
    }

    private function rangesOverlap(float $a1, float $a2, float $b1, float $b2): bool
    {
        return $a1 <= $b2 && $b1 <= $a2;
    }

    private function salinityMatches(string $speciesSalinity, string $zoneSalinity): bool
    {
        return match ($speciesSalinity) {
            'High'  => $zoneSalinity === 'High',
            'Med'   => in_array($zoneSalinity, ['High', 'Med']),
            'Low'   => in_array($zoneSalinity, ['High', 'Med', 'Low']),
            'None'  => $zoneSalinity === 'None',
            default => false,
        };
    }
}
