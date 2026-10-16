<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Area of one Integrated Zoning Map (2020-2029) class within a zone unit,
 * with the part of it under very-high flood and high landslide susceptibility.
 */
class ZoneZoningData extends Model
{
    protected $table = 'zone_zoning_data';

    protected $fillable = [
        'zone_unit_id',
        'zoning_code',
        'area_ha',
        'flood_very_high_ha',
        'landslide_high_ha',
    ];

    protected $casts = [
        'area_ha' => 'decimal:2',
        'flood_very_high_ha' => 'decimal:2',
        'landslide_high_ha' => 'decimal:2',
    ];

    public function zoneUnit(): BelongsTo
    {
        return $this->belongsTo(ZoneUnit::class, 'zone_unit_id', 'zone_unit_id');
    }
}
