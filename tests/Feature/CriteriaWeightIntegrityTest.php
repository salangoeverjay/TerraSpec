<?php

use App\Models\SuitabilityCriteria;
use App\Models\User;
use Database\Seeders\SuitabilityCriteriaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SuitabilityCriteriaSeeder::class);
    $this->actingAs(User::factory()->admin()->create());
});

/**
 * The current weights in the shape the admin screen sends them.
 *
 * @return array<int, array<string, mixed>>
 */
function currentWeightRows(): array
{
    return SuitabilityCriteria::orderBy('criteria_id')->get()->map(fn (SuitabilityCriteria $c) => [
        'criteria_id' => $c->criteria_id,
        'commercial_weight' => (float) $c->commercial_weight,
        'residential_weight' => (float) $c->residential_weight,
        'industrial_weight' => (float) $c->industrial_weight,
        'agricultural_weight' => (float) $c->agricultural_weight,
        'reforestation_weight' => (float) $c->reforestation_weight,
    ])->all();
}

/**
 * An n×n pairwise matrix of equal importance (perfectly consistent).
 *
 * @return array<int, array<int, int>>
 */
function equalImportanceMatrix(int $n): array
{
    return array_fill(0, $n, array_fill(0, $n, 1));
}

it('saves a complete set of weights whose columns sum to 1', function () {
    $rows = currentWeightRows();
    $rows[0]['commercial_weight'] += 0.05;
    $rows[1]['commercial_weight'] -= 0.05;

    $this->putJson('/api/admin/criteria', $rows)->assertOk();

    expect((float) SuitabilityCriteria::find($rows[0]['criteria_id'])->commercial_weight)->toEqual(round($rows[0]['commercial_weight'], 4));
});

it('rejects weights that do not add up to 1 and keeps the old ones', function () {
    $before = currentWeightRows();
    $rows = $before;
    $rows[0]['reforestation_weight'] += 0.2;

    $this->putJson('/api/admin/criteria', $rows)
        ->assertUnprocessable()
        ->assertInvalid(['reforestation_weight' => 'must add up to 1']);

    expect(currentWeightRows())->toEqual($before);
});

it('rejects a weight set that leaves out or repeats a criterion', function () {
    $rows = currentWeightRows();

    $this->putJson('/api/admin/criteria', array_slice($rows, 1))->assertUnprocessable()->assertInvalid(['criteria']);
    $this->putJson('/api/admin/criteria', [...array_slice($rows, 1), $rows[1]])->assertUnprocessable()->assertInvalid(['criteria']);
});

it('rejects an AHP matrix that does not cover every criterion and keeps the old weights', function () {
    $before = currentWeightRows();

    $this->postJson('/api/admin/ahp/apply', ['analysis_type' => 'residential', 'matrix' => equalImportanceMatrix(2)])
        ->assertUnprocessable()
        ->assertInvalid(['matrix' => 'one row per criterion (7)']);

    $matrix = equalImportanceMatrix(7);
    $matrix[3] = [1, 1, 1];
    $this->postJson('/api/admin/ahp/apply', ['analysis_type' => 'residential', 'matrix' => $matrix])
        ->assertUnprocessable()
        ->assertInvalid(['matrix.3']);

    expect(currentWeightRows())->toEqual($before);
});

it('applies a full consistent AHP matrix to every criterion so the column sums to 1', function () {
    $this->postJson('/api/admin/ahp/apply', ['analysis_type' => 'commercial', 'matrix' => equalImportanceMatrix(7)])->assertOk();

    $criteria = SuitabilityCriteria::all();
    expect($criteria->sum('commercial_weight'))->toEqualWithDelta(1, 0.001)
        ->and($criteria->pluck('commercial_weight')->map(fn ($w) => round((float) $w, 4))->unique()->all())->toBe([round(1 / 7, 4)])
        ->and((float) $criteria->first()->default_weight)->toEqualWithDelta(1 / 7, 0.0001);
});

it('still rejects an inconsistent AHP matrix', function () {
    $matrix = equalImportanceMatrix(7);
    [$matrix[0][1], $matrix[1][0]] = [9, 1 / 9];
    [$matrix[1][2], $matrix[2][1]] = [9, 1 / 9];
    [$matrix[0][2], $matrix[2][0]] = [1 / 9, 9];

    $this->postJson('/api/admin/ahp/apply', ['analysis_type' => 'commercial', 'matrix' => $matrix])
        ->assertUnprocessable()
        ->assertJsonPath('valid', false)
        ->assertJson(fn ($json) => $json->where('message', fn ($message) => str_contains($message, 'Consistency Ratio'))->etc());
});
