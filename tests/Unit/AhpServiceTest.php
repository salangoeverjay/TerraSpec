<?php

use App\Services\AhpService;

it('returns the principal eigenvector weights and CR for the Saaty textbook matrix', function () {
    $result = (new AhpService)->compute([
        [1, 3, 5],
        [1 / 3, 1, 3],
        [1 / 5, 1 / 3, 1],
    ]);

    expect($result['weights'][0])->toEqualWithDelta(0.637, 0.001)
        ->and($result['weights'][1])->toEqualWithDelta(0.258, 0.001)
        ->and($result['weights'][2])->toEqualWithDelta(0.105, 0.001)
        ->and(array_sum($result['weights']))->toEqualWithDelta(1.0, 1e-9)
        ->and($result['cr'])->toEqualWithDelta(0.033, 0.001)
        ->and($result['valid'])->toBeTrue();
});

it('gives equal weights and zero CR for a matrix of ones', function () {
    $result = (new AhpService)->compute(array_fill(0, 4, array_fill(0, 4, 1)));

    expect($result['weights'])->each->toEqualWithDelta(0.25, 1e-9)
        ->and($result['cr'])->toEqualWithDelta(0.0, 1e-9);
});

it('flags an inconsistent matrix as invalid', function () {
    // A > B, B > C, but C > A strongly: intransitive
    $result = (new AhpService)->compute([
        [1, 5, 1 / 7],
        [1 / 5, 1, 5],
        [7, 1 / 5, 1],
    ]);

    expect($result['cr'])->toBeGreaterThanOrEqual(0.10)
        ->and($result['valid'])->toBeFalse();
});

it('rejects a non-reciprocal matrix', function () {
    (new AhpService)->compute([
        [1, 3],
        [3, 1],
    ]);
})->throws(InvalidArgumentException::class);
