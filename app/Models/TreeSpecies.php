<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TreeSpecies extends Model
{
    protected $primaryKey = 'species_id';

    protected $fillable = [
        'common_name',
        'scientific_name',
        'soil_preference',
        'elevation_range',
        'temperature_range',
        'salinity_level',
        'suitability_notes',
    ];
}
