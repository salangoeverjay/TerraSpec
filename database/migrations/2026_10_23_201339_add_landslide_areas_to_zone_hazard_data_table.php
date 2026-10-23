<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Landslide hectares from the MGB 2020 map, and "unknown" (null) for the storm surge, drought
     * and sea level rise flags, which have no verified source loaded yet.
     */
    public function up(): void
    {
        Schema::table('zone_hazard_data', function (Blueprint $table) {
            $table->decimal('landslide_high_ha', 10, 2)->default(0)->after('liquefaction_none_ha');
            $table->decimal('landslide_moderate_ha', 10, 2)->default(0)->after('landslide_high_ha');
            $table->boolean('has_storm_surge')->nullable()->default(null)->change();
            $table->boolean('has_drought')->nullable()->default(null)->change();
            $table->boolean('has_sea_level_rise')->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('zone_hazard_data', function (Blueprint $table) {
            $table->dropColumn(['landslide_high_ha', 'landslide_moderate_ha']);
            $table->boolean('has_storm_surge')->default(false)->nullable(false)->change();
            $table->boolean('has_drought')->default(false)->nullable(false)->change();
            $table->boolean('has_sea_level_rise')->default(false)->nullable(false)->change();
        });
    }
};
