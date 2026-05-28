<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZoneHazardData extends Model
{
    protected $fillable = [
        'zone_unit_id',
        'flood_high_ha',
        'flood_moderate_ha',
        'flood_low_ha',
        'flood_none_ha',
        'liquefaction_hsa_ha',
        'liquefaction_lsa_ha',
        'liquefaction_msa_ha',
        'storm_surge_high_ha',
        'storm_surge_moderate_ha',
        'storm_surge_low_ha',
        'has_flood',
        'has_landslide',
        'has_storm_surge',
        'has_drought',
        'has_sea_level_rise',
    ];

    protected $casts = [
        'has_flood'         => 'boolean',
        'has_landslide'     => 'boolean',
        'has_storm_surge'   => 'boolean',
        'has_drought'       => 'boolean',
        'has_sea_level_rise'=> 'boolean',
    ];

    public function zoneUnit(): BelongsTo
    {
        return $this->belongsTo(ZoneUnit::class, 'zone_unit_id', 'zone_unit_id');
    }
}
