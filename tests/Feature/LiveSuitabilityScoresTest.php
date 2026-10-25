<?php

use App\Models\SuitabilityAnalysis;
use App\Models\SuitabilityCriteria;
use App\Models\ZoneUnit;
use App\Services\TerraSpecContextService;
use Database\Seeders\ReforestationSiteSeeder;
use Database\Seeders\SuitabilityCriteriaSeeder;
use Database\Seeders\ZoneHazardDataSeeder;
use Database\Seeders\ZoneUnitSeeder;
use Database\Seeders\ZoneZoningDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([ZoneUnitSeeder::class, ZoneHazardDataSeeder::class, ZoneZoningDataSeeder::class, ReforestationSiteSeeder::class, SuitabilityCriteriaSeeder::class]);
    $this->gredu = ZoneUnit::where('unit_name', 'Gredu')->firstOrFail();
});

/**
 * Commercial weights that put everything on flood risk (the column still sums to 1).
 */
function weightCommercialOnFloodOnly(): void
{
    SuitabilityCriteria::query()->update(['commercial_weight' => 0]);
    SuitabilityCriteria::where('criteria_name', 'Flood Risk')->update(['commercial_weight' => 1]);
}

function commercialRankingOf(int $zoneUnitId, $test): array
{
    return collect($test->getJson('/suitability/rankings?analysis_type=commercial')->assertOk()->json('data'))
        ->firstWhere('zone_unit_id', $zoneUnitId);
}

it('shows a weight change at once in the rankings, summary and breakdown', function () {
    $before = commercialRankingOf($this->gredu->zone_unit_id, $this)['total_pct'];

    weightCommercialOnFloodOnly();

    $ranking = commercialRankingOf($this->gredu->zone_unit_id, $this)['total_pct'];
    $breakdown = $this->getJson("/suitability/breakdown?analysis_type=commercial&zone_unit_id={$this->gredu->zone_unit_id}")->json('data.total_pct');
    $summary = collect($this->getJson('/suitability/summary')->json('data'))->firstWhere('zone_unit_id', $this->gredu->zone_unit_id)['scores']['commercial']['pct'];

    expect($ranking)->not->toEqual($before)
        ->and($breakdown)->toEqual($ranking)
        ->and($summary)->toEqual($ranking);
});

it('gives the chat one live suitability chip per barangay', function () {
    SuitabilityAnalysis::create(['zone_unit_id' => $this->gredu->zone_unit_id, 'analysis_type' => 'commercial', 'total_score' => 0.99, 'suitability_level' => 'Highly Suitable']);
    SuitabilityAnalysis::create(['zone_unit_id' => $this->gredu->zone_unit_id, 'analysis_type' => 'commercial', 'total_score' => 0.98, 'suitability_level' => 'Highly Suitable']);
    config()->set('services.gemini.api_key', 'test-api-key');
    Http::fake(['*' => Http::response(['candidates' => [['content' => ['parts' => [['text' => 'Gredu is the strongest commercial area.']]]]]])]);

    $chips = $this->postJson('/api/chatbot', ['prompt' => 'Where should I open a shop in Gredu?'])->assertOk()->json('recommended_zones');

    expect($chips)->toHaveCount(1)
        ->and($chips[0]['unit_name'])->toBe('Gredu')
        ->and($chips[0]['total_pct'])->toEqual(commercialRankingOf($this->gredu->zone_unit_id, $this)['total_pct']);
});

it('gives the AI the same live scores as the rankings page', function () {
    weightCommercialOnFloodOnly();
    $ranking = commercialRankingOf($this->gredu->zone_unit_id, $this);

    expect(app(TerraSpecContextService::class)->build())
        ->toContain("Gredu ({$ranking['unit_type']}) — {$ranking['total_pct']}% [{$ranking['suitability_level']}]")
        ->toContain('computed live from the current AHP weights');
});
