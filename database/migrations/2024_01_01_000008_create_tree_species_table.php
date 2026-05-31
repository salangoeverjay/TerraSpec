<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tree_species', function (Blueprint $table) {
            $table->id('species_id');
            $table->string('common_name');
            $table->string('scientific_name');
            $table->string('soil_preference');
            $table->string('elevation_range');
            $table->string('temperature_range');
            $table->string('salinity_level');
            $table->text('suitability_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tree_species');
    }
};
