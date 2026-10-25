<?php

use App\Services\AnalysisTypeDetector;

it('detects the analysis type from a natural language query', function (string $query, string $expected) {
    expect((new AnalysisTypeDetector)->detect($query))->toBe($expected);
})->with([
    'plant trees' => ['Where should we plant trees?', 'reforestation'],
    'mangrove planting' => ['mangrove planting area', 'reforestation'],
    'mangrove local name' => ['where can we plant bakawan seedlings', 'reforestation'],
    'restore forest' => ['restore the forest near the river', 'reforestation'],
    'tree nursery' => ['best site for a tree nursery', 'reforestation'],
    'power plant' => ['location for a power plant', 'industrial'],
    'warehouses' => ['where can we put warehouses', 'industrial'],
    'warehouse is not house' => ['best barangay for a warehouse', 'industrial'],
    'banana plantation' => ['expand a banana plantation', 'agricultural'],
    'school' => ['where to build a school', 'commercial'],
    'subdivision' => ['new housing subdivision', 'residential'],
    'residents' => ['safe area for new residents', 'residential'],
    'report is not port' => ['generate a flood report for farms', 'agricultural'],
    'no keyword' => ['what is suitable here', 'commercial'],
]);
