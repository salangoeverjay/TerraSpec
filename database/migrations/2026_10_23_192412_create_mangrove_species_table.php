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
        Schema::create('mangrove_species', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('list_order');
            $table->string('local_name');
            $table->string('scientific_name')->unique();
            $table->string('family');
            $table->string('category'); // true_mangrove, associate
            $table->string('iucn_status');
            $table->string('habit');
            $table->string('tidal_zone'); // seaward, middle, landward, riverine, back_mangrove
            $table->text('zone_note')->nullable();
            $table->string('source');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mangrove_species');
    }
};
