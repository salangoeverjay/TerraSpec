<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('zone_zoning_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_unit_id')->constrained('zone_units', 'zone_unit_id')->cascadeOnDelete();
            $table->string('zoning_code', 8); // zone code from zoning_2020.geojson, or 'NONE' for unzoned remainder
            $table->decimal('area_ha', 10, 2)->default(0);
            $table->decimal('flood_very_high_ha', 10, 2)->default(0);
            $table->decimal('landslide_high_ha', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['zone_unit_id', 'zoning_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zone_zoning_data');
    }
};
