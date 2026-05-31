<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ZoneUnit extends Model
{
    protected $primaryKey = 'zone_unit_id';

    protected $fillable = [
        'unit_name',
        'unit_type',
        'total_area_ha',
        'population_2020',
        'household_count',
        'population_density',
        'avg_household_size',
        'settlement_tier',
        'saturation_index',
        'dominant_soil_type',
        'dominant_slope_class',
        'land_capability_class',
        'elevation_min',
        'elevation_max',
        'salinity_level',
        'center_latitude',
        'center_longitude',
        'geojson_poly',
    ];

    protected $casts = [
        'total_area_ha'      => 'decimal:2',
        'population_density' => 'decimal:2',
        'saturation_index'   => 'decimal:4',
        'center_latitude'    => 'decimal:7',
        'center_longitude'   => 'decimal:7',
    ];

    public function hazardData(): HasOne
    {
        return $this->hasOne(ZoneHazardData::class, 'zone_unit_id', 'zone_unit_id');
    }

    public function soilData(): HasOne
    {
        return $this->hasOne(ZoneSoilData::class, 'zone_unit_id', 'zone_unit_id');
    }

    public function populationProjections(): HasMany
    {
        return $this->hasMany(PopulationProjection::class, 'zone_unit_id', 'zone_unit_id');
    }

    public function suitabilityAnalyses(): HasMany
    {
        return $this->hasMany(SuitabilityAnalysis::class, 'zone_unit_id', 'zone_unit_id');
    }

    public function latestAnalysis(): HasOne
    {
        return $this->hasOne(SuitabilityAnalysis::class, 'zone_unit_id', 'zone_unit_id')
                    ->latestOfMany('analysis_id');
    }

    public function restrictions(): BelongsToMany
    {
        return $this->belongsToMany(
            EnvironmentalRestriction::class,
            'zone_restrictions',
            'zone_unit_id',
            'restriction_id'
        );
    }
}
