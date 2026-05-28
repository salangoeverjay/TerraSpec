<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zone_hazard_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_unit_id')->constrained('zone_units', 'zone_unit_id')->cascadeOnDelete();
            $table->decimal('flood_high_ha', 10, 2)->default(0);
            $table->decimal('flood_moderate_ha', 10, 2)->default(0);
            $table->decimal('flood_low_ha', 10, 2)->default(0);
            $table->decimal('flood_none_ha', 10, 2)->default(0);
            $table->decimal('liquefaction_hsa_ha', 10, 2)->default(0);
            $table->decimal('liquefaction_lsa_ha', 10, 2)->default(0);
            $table->decimal('liquefaction_msa_ha', 10, 2)->default(0);
            $table->decimal('storm_surge_high_ha', 10, 2)->default(0);
            $table->decimal('storm_surge_moderate_ha', 10, 2)->default(0);
            $table->decimal('storm_surge_low_ha', 10, 2)->default(0);
            $table->boolean('has_flood')->default(false);
            $table->boolean('has_landslide')->default(false);
            $table->boolean('has_storm_surge')->default(false);
            $table->boolean('has_drought')->default(false);
            $table->boolean('has_sea_level_rise')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_hazard_data');
    }
};
