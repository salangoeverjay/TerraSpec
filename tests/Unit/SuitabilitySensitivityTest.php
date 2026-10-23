<?php

use App\Services\SuitabilityComparisonService;
use App\Services\SuitabilityScoreService;
use App\Services\SuitabilitySensitivityService;

function sensitivity(): SuitabilitySensitivityService
{
    return new SuitabilitySensitivityService(new SuitabilityComparisonService(new SuitabilityScoreService));
}

it('moves one weight by the step and rescales the others to sum to 1', function () {
    $weights = sensitivity()->perturb([0.5, 0.3, 0.2], 0, 0.20);

    // 0.5 → 0.6; the remaining 0.4 is shared 3:2 as before
    expect($weights)->toEqualWithDelta([0.6, 0.24, 0.16], 1e-9)
        ->and(array_sum($weights))->toEqualWithDelta(1.0, 1e-9);
});

it('keeps the ratio between the untouched weights', function () {
    $weights = sensitivity()->perturb([0.35, 0.20, 0.15, 0.15, 0.05, 0.05, 0.05], 1, -0.10);

    expect($weights[1])->toEqualWithDelta(0.18, 1e-9)
        ->and($weights[0] / $weights[2])->toEqualWithDelta(0.35 / 0.15, 1e-9)
        ->and(array_sum($weights))->toEqualWithDelta(1.0, 1e-9);
});
