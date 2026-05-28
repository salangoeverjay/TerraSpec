<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuitabilityCriteria extends Model
{
    protected $table = 'suitability_criteria';

    protected $primaryKey = 'criteria_id';

    protected $fillable = [
        'criteria_name',
        'default_weight',
        'commercial_weight',
        'residential_weight',
        'industrial_weight',
        'agricultural_weight',
        'reforestation_weight',
        'description',
    ];

    public function getWeightForType(string $analysisType): float
    {
        $column = match ($analysisType) {
            'commercial'    => 'commercial_weight',
            'residential'   => 'residential_weight',
            'industrial'    => 'industrial_weight',
            'agricultural'  => 'agricultural_weight',
            'reforestation' => 'reforestation_weight',
            default         => 'default_weight',
        };

        return (float) $this->{$column};
    }
}
