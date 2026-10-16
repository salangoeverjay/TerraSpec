<?php

use App\Services\SuitabilityScoreService;

it('detects the analysis type from a natural language query', function (string $query, string $expected) {
    expect((new SuitabilityScoreService)->detectAnalysisType($query))->toBe($expected);
})->with([
    'plant trees' => ['Where should we plant trees?', 'reforestation'],
    'mangrove planting' => ['mangrove planting area', 'reforestation'],
    'restore forest' => ['restore the forest near the river', 'reforestation'],
    'tree nursery' => ['best site for a tree nursery', 'reforestation'],
    'power plant' => ['location for a power plant', 'industrial'],
    'warehouses' => ['where can we put warehouses', 'industrial'],
    'banana plantation' => ['expand a banana plantation', 'agricultural'],
    'school' => ['where to build a school', 'commercial'],
    'subdivision' => ['new housing subdivision', 'residential'],
    'report is not port' => ['generate a flood report for farms', 'agricultural'],
    'no keyword' => ['what is suitable here', 'commercial'],
]);
