<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zone_units', function (Blueprint $table) {
            $table->id('zone_unit_id');
            $table->string('unit_name');
            $table->string('unit_type'); // 'Urban' or 'Rural'
            $table->decimal('total_area_ha', 10, 2);
            $table->integer('population_2020');
            $table->integer('household_count');
            $table->decimal('population_density', 10, 2);
            $table->integer('avg_household_size');
            $table->string('settlement_tier'); // 'CBD', 'Minor_Growth', 'Emerging', 'Satellite'
            $table->decimal('saturation_index', 5, 4)->default(0);
            $table->string('dominant_soil_type')->nullable();
            $table->string('dominant_slope_class')->nullable(); // '0-8', '8-18', '18-30', '30-50', '50+'
            $table->string('land_capability_class')->nullable(); // A, B, C, D
            $table->decimal('center_latitude', 10, 7)->nullable();
            $table->decimal('center_longitude', 10, 7)->nullable();
            $table->text('geojson_poly')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_units');
    }
};