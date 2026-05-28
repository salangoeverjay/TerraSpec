<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suitability_analyses', function (Blueprint $table) {
            $table->id('analysis_id');
            $table->foreignId('zone_unit_id')->constrained('zone_units', 'zone_unit_id')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('analysis_type'); // 'commercial', 'residential', 'industrial', 'agricultural', 'reforestation'
            $table->string('use_subtype')->nullable();
            $table->decimal('flood_score', 5, 4)->default(0);
            $table->decimal('slope_score', 5, 4)->default(0);
            $table->decimal('soil_score', 5, 4)->default(0);
            $table->decimal('population_score', 5, 4)->default(0);
            $table->decimal('saturation_score', 5, 4)->default(0);
            $table->decimal('liquefaction_score', 5, 4)->default(0);
            $table->decimal('total_score', 5, 4)->default(0);
            $table->string('suitability_level'); // 'Highly Suitable', 'Moderately Suitable', 'Low Suitability', 'Not Suitable'
            $table->json('criteria_breakdown')->nullable();
            $table->json('applied_weights')->nullable();
            $table->timestamp('date_created')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suitability_analyses');
    }
};
