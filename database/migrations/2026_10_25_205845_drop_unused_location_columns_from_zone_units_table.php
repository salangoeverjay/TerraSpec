<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The barangay centre and polygon columns were never filled or read: boundaries come from
 * public/data/panabo_barangays.geojson and label positions from resources/js/data.js.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zone_units', function (Blueprint $table) {
            $table->dropColumn(['center_latitude', 'center_longitude', 'geojson_poly']);
        });
    }

    public function down(): void
    {
        Schema::table('zone_units', function (Blueprint $table) {
            $table->decimal('center_latitude', 10, 7)->nullable();
            $table->decimal('center_longitude', 10, 7)->nullable();
            $table->text('geojson_poly')->nullable();
        });
    }
};
