<?php

namespace App\Models;

use Database\Factories\MangroveSpeciesFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A true mangrove or mangrove associate recorded in Davao del Norte (Pototan et al., 2017),
 * with the tidal zone where it is generally planted.
 */
class MangroveSpecies extends Model
{
    /** @use HasFactory<MangroveSpeciesFactory> */
    use HasFactory;

    protected $table = 'mangrove_species';

    /** Seaward to landward, then brackish river banks and the back mangrove (associates). */
    public const TIDAL_ZONES = [
        'seaward' => 'Seaward fringe (low intertidal, flooded every tide)',
        'middle' => 'Middle intertidal (soft, deep mud; creek banks)',
        'landward' => 'Landward (high intertidal, firmer ground, flooded less often)',
        'riverine' => 'Brackish river banks and estuaries (lower salinity)',
        'back_mangrove' => 'Back mangrove and beach margin (above most tides)',
    ];

    public const CATEGORIES = [
        'true_mangrove' => 'True mangrove',
        'associate' => 'Mangrove associate',
    ];

    protected $fillable = [
        'list_order',
        'local_name',
        'scientific_name',
        'family',
        'category',
        'iucn_status',
        'habit',
        'tidal_zone',
        'zone_note',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'list_order' => 'integer',
        ];
    }
}
