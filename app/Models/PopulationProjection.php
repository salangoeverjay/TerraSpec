<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PopulationProjection extends Model
{
    protected $primaryKey = 'projection_id';

    protected $fillable = [
        'zone_unit_id',
        'year',
        'population',
    ];

    public function zoneUnit(): BelongsTo
    {
        return $this->belongsTo(ZoneUnit::class, 'zone_unit_id', 'zone_unit_id');
    }
}
