<?php

/*
|--------------------------------------------------------------------------
| Suitability analysis: constraints and zoning compatibility
|--------------------------------------------------------------------------
|
| The score is a constraint-masked AHP weighted linear combination:
|
|   1. Constraints (sieve, as in CLUP 2020-2029 §2.04.02 "Development
|      Constraints"): land that may not be used for the analysis type is
|      removed from each zone unit before scoring. If less than
|      `min_available_share` of the zoned area is left, the unit is
|      "Not Suitable" by constraint and is not scored.
|   2. Criteria are scored 0-1 and combined with the AHP weights stored in
|      suitability_criteria.
|
| Zoning codes come from public/data/zoning_2020.geojson (Panabo City
| Integrated Zoning Map C.Y. 2020-2029). These defaults are proposals based
| on the HLURB model zoning ordinance; confirm them against Panabo's
| Zoning Ordinance before using results for decisions.
|
| Codes: PA Production Agricultural (SAFDZ/NPAAAD), FR Forest Reserve,
| MG Mangrove, QZ Quarry, GR General Residential, R-1 Residential-1,
| C Commercial (C-2/C-3), GC General Commercial, AI Agri-Industrial,
| I Industrial (I-1/I-2/I-3), INS Institutional, TZ Tourism,
| PRC Parks/Cemetery, BG Buffer/Greenbelt, UTS Utilities/Transport.
|
*/

$urbanConstraints = [
    'zoning' => ['PA', 'FR', 'MG', 'QZ', 'BG'],
    'flood_very_high' => true,
    'landslide_high' => true,
];

return [

    'min_available_share' => 0.05,

    // Environmental restriction types and how strictly they limit development:
    // "protected" = no development (counts as protected), "regulated" = development limited by the CLUP.
    'restriction_types' => [
        'Mangrove' => 'protected',
        'Mangrove site' => 'protected',
        'Forest' => 'protected',
        'Buffer' => 'regulated',
        'SAFDZ' => 'regulated',
        'Ecological' => 'regulated',
        'Hazard' => 'regulated',
    ],

    'constraints' => [
        'commercial' => $urbanConstraints,
        'residential' => $urbanConstraints,
        'industrial' => $urbanConstraints,
        'agricultural' => [
            'zoning' => ['FR', 'MG', 'BG', 'QZ', 'GR', 'R-1', 'C', 'GC', 'I', 'INS', 'UTS'],
            'flood_very_high' => false,
            'landslide_high' => false,
        ],
        // Mangrove (intertidal) sites are assessed separately from terrestrial reforestation.
        'reforestation' => [
            'zoning' => ['MG', 'GR', 'R-1', 'C', 'GC', 'I', 'INS', 'UTS', 'TZ', 'AI'],
            'flood_very_high' => false,
            'landslide_high' => false,
        ],
    ],

    'constraint_labels' => [
        'PA' => 'Production Agricultural / SAFDZ',
        'FR' => 'Forest Reserve',
        'MG' => 'Mangrove',
        'QZ' => 'Quarry',
        'BG' => 'Buffer / Greenbelt',
        'GR' => 'General Residential',
        'R-1' => 'Residential-1',
        'C' => 'Commercial',
        'GC' => 'General Commercial',
        'AI' => 'Agri-Industrial',
        'I' => 'Industrial',
        'INS' => 'Institutional',
        'TZ' => 'Tourism',
        'PRC' => 'Parks / Cemetery',
        'UTS' => 'Utilities / Transport',
        'flood_very_high' => 'Very high flood susceptibility',
        'landslide_high' => 'High landslide susceptibility',
    ],

    // 0-1: how far each zoning class permits the analysis type (1 = principal use).
    'zoning_compatibility' => [
        'commercial' => [
            'C' => 1.0, 'GC' => 1.0, 'TZ' => 0.6, 'GR' => 0.6, 'UTS' => 0.5, 'R-1' => 0.3,
            'I' => 0.3, 'AI' => 0.3, 'INS' => 0.3, 'PRC' => 0.2, 'PA' => 0.1,
        ],
        'residential' => [
            'GR' => 1.0, 'R-1' => 1.0, 'C' => 0.6, 'GC' => 0.6, 'INS' => 0.3, 'TZ' => 0.3,
            'UTS' => 0.2, 'PA' => 0.1, 'AI' => 0.1,
        ],
        'industrial' => [
            'I' => 1.0, 'AI' => 0.8, 'UTS' => 0.5, 'GC' => 0.4, 'C' => 0.2, 'PA' => 0.1,
        ],
        'agricultural' => [
            'PA' => 1.0, 'AI' => 0.6, 'PRC' => 0.2, 'TZ' => 0.2,
        ],
        'reforestation' => [
            'FR' => 1.0, 'BG' => 1.0, 'PRC' => 0.6, 'QZ' => 0.5, 'PA' => 0.4,
        ],
    ],

];
