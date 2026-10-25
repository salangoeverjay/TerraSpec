<?php

namespace App\Models;

use Database\Factories\ReforestationSiteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An actual reforestation site (mangrove rehabilitation, adopted or proposed MOA area), with the
 * share of it inside the Mangrove sub-zone, other zoning classes, or outside the zoning map.
 */
class ReforestationSite extends Model
{
    /** @use HasFactory<ReforestationSiteFactory> */
    use HasFactory;

    public const STATUSES = ['rehabilitated', 'adopted', 'proposed'];

    /**
     * Statuses counted as verified planted area. Proposed sites are still mapped and still define the
     * study area, but nothing has been planted on them yet.
     */
    public const PLANTED_STATUSES = ['rehabilitated', 'adopted'];

    protected $fillable = [
        'zone_unit_id',
        'name',
        'site_type',
        'status',
        'year',
        'adopter',
        'area_ha',
        'mangrove_zone_share',
        'other_zone_share',
        'unzoned_share',
        'distance_to_boundary_m',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'area_ha' => 'float',
            'mangrove_zone_share' => 'float',
            'other_zone_share' => 'float',
            'unzoned_share' => 'float',
            'distance_to_boundary_m' => 'integer',
        ];
    }

    public function zoneUnit(): BelongsTo
    {
        return $this->belongsTo(ZoneUnit::class, 'zone_unit_id', 'zone_unit_id');
    }
}
