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
        Schema::create('reforestation_sites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_unit_id')->constrained('zone_units', 'zone_unit_id')->cascadeOnDelete();
            $table->string('name');
            $table->string('site_type')->default('mangrove');
            $table->string('status'); // rehabilitated, adopted, proposed
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('adopter')->nullable();
            $table->decimal('area_ha', 8, 2);
            $table->decimal('mangrove_zone_share', 5, 4)->default(0);
            $table->decimal('other_zone_share', 5, 4)->default(0);
            $table->decimal('unzoned_share', 5, 4)->default(0);
            $table->unsignedInteger('distance_to_boundary_m')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reforestation_sites');
    }
};
