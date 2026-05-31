<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class EnvironmentalRestriction extends Model
{
    protected $primaryKey = 'restriction_id';

    protected $fillable = [
        'restriction_name',
        'restriction_type',
        'description',
    ];

    public function zoneUnits(): BelongsToMany
    {
        return $this->belongsToMany(
            ZoneUnit::class,
            'zone_restrictions',
            'restriction_id',
            'zone_unit_id'
        );
    }
}
