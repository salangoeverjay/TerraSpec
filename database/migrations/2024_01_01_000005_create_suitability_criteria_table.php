<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suitability_criteria', function (Blueprint $table) {
            $table->id('criteria_id');
            $table->string('criteria_name');
            $table->decimal('default_weight', 5, 4);
            $table->decimal('commercial_weight', 5, 4)->default(0);
            $table->decimal('residential_weight', 5, 4)->default(0);
            $table->decimal('industrial_weight', 5, 4)->default(0);
            $table->decimal('agricultural_weight', 5, 4)->default(0);
            $table->decimal('reforestation_weight', 5, 4)->default(0);
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suitability_criteria');
    }
};
