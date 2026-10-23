<?php

use App\Services\SuitabilityComparisonService;
use App\Services\SuitabilityScoreService;

function comparison(): SuitabilityComparisonService
{
    return new SuitabilityComparisonService(new SuitabilityScoreService);
}

it('gives a constant criterion zero entropy weight', function () {
    $weights = comparison()->entropyWeights([
        [0.5, 0.1],
        [0.5, 0.9],
        [0.5, 0.4],
    ]);

    expect($weights[0])->toEqualWithDelta(0.0, 1e-9)
        ->and($weights[1])->toEqualWithDelta(1.0, 1e-9);
});

it('gives more entropy weight to the criterion that varies more', function () {
    $weights = comparison()->entropyWeights([
        [0.50, 0.1],
        [0.55, 0.9],
        [0.45, 0.5],
    ]);

    expect($weights[1])->toBeGreaterThan($weights[0])
        ->and(array_sum($weights))->toEqualWithDelta(1.0, 1e-9);
});

it('computes the weighted linear combination', function () {
    expect(comparison()->wlc([[1, 0], [0.5, 0.5]], [0.7, 0.3]))
        ->toEqualWithDelta([0.7, 0.5], 1e-9);
});

it('places the ideal, anti-ideal and midpoint alternatives correctly in TOPSIS', function () {
    $closeness = comparison()->topsis([
        [1, 1],
        [0, 0],
        [0.5, 0.5],
    ], [0.5, 0.5]);

    expect($closeness[0])->toEqualWithDelta(1.0, 1e-9)
        ->and($closeness[1])->toEqualWithDelta(0.0, 1e-9)
        ->and($closeness[2])->toEqualWithDelta(0.5, 1e-9);
});

it('scores symmetric trade-offs equally in TOPSIS', function () {
    $closeness = comparison()->topsis([[1, 0], [0, 1]], [0.5, 0.5]);

    expect($closeness[0])->toEqualWithDelta(0.5, 1e-9)
        ->and($closeness[1])->toEqualWithDelta(0.5, 1e-9);
});

it('computes Spearman correlation for identical, reversed and tied rankings', function () {
    $service = comparison();

    expect($service->spearman([1, 2, 3, 4], [10, 20, 30, 40]))->toEqualWithDelta(1.0, 1e-9)
        ->and($service->spearman([1, 2, 3, 4], [4, 3, 2, 1]))->toEqualWithDelta(-1.0, 1e-9)
        ->and($service->spearman([1, 2, 2, 3], [1, 2, 2, 3]))->toEqualWithDelta(1.0, 1e-9);
});

it('ranks by descending score with competition or average ties', function () {
    $service = comparison();

    expect($service->ranks([0.3, 0.9, 0.9, 0.1]))->toBe([0 => 3, 1 => 1, 2 => 1, 3 => 4])
        ->and($service->ranks([0.3, 0.9, 0.9, 0.1], average: true))->toEqual([0 => 3, 1 => 1.5, 2 => 1.5, 3 => 4]);
});
