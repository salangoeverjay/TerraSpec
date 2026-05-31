<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zone_restrictions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('restriction_id');
            $table->unsignedBigInteger('zone_unit_id');
            $table->foreign('restriction_id')
                  ->references('restriction_id')
                  ->on('environmental_restrictions')
                  ->onDelete('cascade');
            $table->foreign('zone_unit_id')
                  ->references('zone_unit_id')
                  ->on('zone_units')
                  ->onDelete('cascade');
            $table->unique(['restriction_id', 'zone_unit_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_restrictions');
    }
};
