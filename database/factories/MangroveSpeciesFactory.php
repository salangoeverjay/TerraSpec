<?php

namespace Database\Factories;

use App\Models\MangroveSpecies;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MangroveSpecies>
 */
class MangroveSpeciesFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'list_order' => fake()->numberBetween(1, 50),
            'local_name' => fake()->unique()->word(),
            'scientific_name' => ucfirst(fake()->unique()->word()).' '.fake()->word(),
            'family' => 'Rhizophoraceae',
            'category' => 'true_mangrove',
            'iucn_status' => 'Least concern',
            'habit' => 'Tree',
            'tidal_zone' => fake()->randomElement(array_keys(MangroveSpecies::TIDAL_ZONES)),
            'zone_note' => null,
            'source' => 'Test source',
        ];
    }

    public function associate(): static
    {
        return $this->state(fn () => ['category' => 'associate', 'tidal_zone' => 'back_mangrove']);
    }
}
