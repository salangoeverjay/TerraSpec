<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('population_projections', function (Blueprint $table) {
            $table->id('projection_id');
            $table->foreignId('zone_unit_id')->constrained('zone_units', 'zone_unit_id')->cascadeOnDelete();
            $table->integer('year');
            $table->integer('population');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('population_projections');
    }
};