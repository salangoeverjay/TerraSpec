<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zone_units', function (Blueprint $table) {
            $table->integer('elevation_min')->default(0)->after('land_capability_class');
            $table->integer('elevation_max')->default(100)->after('elevation_min');
            $table->string('salinity_level')->default('None')->after('elevation_max');
        });
    }

    public function down(): void
    {
        Schema::table('zone_units', function (Blueprint $table) {
            $table->dropColumn(['elevation_min', 'elevation_max', 'salinity_level']);
        });
    }
};
