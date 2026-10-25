<?php

namespace Database\Factories;

use App\Models\ReforestationSite;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReforestationSite>
 */
class ReforestationSiteFactory extends Factory
{
    /**
     * Define the model's default state. Pass zone_unit_id (zone units have no factory).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $mangroveShare = fake()->randomFloat(4, 0, 1);

        return [
            'name' => 'Mangrove Rehabilitation '.fake()->numberBetween(2020, 2025),
            'site_type' => 'mangrove',
            'status' => 'rehabilitated',
            'year' => fake()->numberBetween(2020, 2025),
            'adopter' => null,
            'area_ha' => fake()->randomFloat(2, 0.3, 2),
            'mangrove_zone_share' => $mangroveShare,
            'other_zone_share' => 0,
            'unzoned_share' => round(1 - $mangroveShare, 4),
            'distance_to_boundary_m' => fake()->numberBetween(0, 200),
        ];
    }

    public function adopted(string $adopter = 'DICT'): static
    {
        return $this->state(fn () => ['status' => 'adopted', 'year' => null, 'adopter' => $adopter, 'name' => "{$adopter}_Adopted Site"]);
    }

    public function proposed(): static
    {
        return $this->state(fn () => ['status' => 'proposed', 'year' => null, 'name' => 'Proposed MOA '.fake()->numberBetween(1, 5)]);
    }
}
