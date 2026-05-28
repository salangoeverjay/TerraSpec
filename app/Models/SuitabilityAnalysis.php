<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuitabilityAnalysis extends Model
{
    protected $primaryKey = 'analysis_id';

    protected $fillable = [
        'zone_unit_id',
        'user_id',
        'analysis_type',
        'use_subtype',
        'flood_score',
        'slope_score',
        'soil_score',
        'population_score',
        'saturation_score',
        'liquefaction_score',
        'total_score',
        'suitability_level',
        'criteria_breakdown',
        'applied_weights',
    ];

    protected $casts = [
        'flood_score'        => 'decimal:4',
        'slope_score'        => 'decimal:4',
        'soil_score'         => 'decimal:4',
        'population_score'   => 'decimal:4',
        'saturation_score'   => 'decimal:4',
        'liquefaction_score' => 'decimal:4',
        'total_score'        => 'decimal:4',
        'criteria_breakdown' => 'array',
        'applied_weights'    => 'array',
        'date_created'       => 'datetime',
    ];

    public function zoneUnit(): BelongsTo
    {
        return $this->belongsTo(ZoneUnit::class, 'zone_unit_id', 'zone_unit_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
