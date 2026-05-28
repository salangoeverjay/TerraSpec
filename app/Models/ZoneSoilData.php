<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZoneSoilData extends Model
{
    protected $fillable = [
        'zone_unit_id',
        'cabangan_clay_loam_ha',
        'camasan_sandy_clay_loam_ha',
        'matina_clay_loam_ha',
        'san_manuel_silty_clay_loam_ha',
    ];

    public function zoneUnit(): BelongsTo
    {
        return $this->belongsTo(ZoneUnit::class, 'zone_unit_id', 'zone_unit_id');
    }
}
