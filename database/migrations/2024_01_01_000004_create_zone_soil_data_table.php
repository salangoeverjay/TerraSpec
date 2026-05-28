<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zone_soil_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_unit_id')->constrained('zone_units', 'zone_unit_id')->cascadeOnDelete();
            $table->decimal('cabangan_clay_loam_ha', 10, 2)->default(0);
            $table->decimal('camasan_sandy_clay_loam_ha', 10, 2)->default(0);
            $table->decimal('matina_clay_loam_ha', 10, 2)->default(0);
            $table->decimal('san_manuel_silty_clay_loam_ha', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_soil_data');
    }
};
