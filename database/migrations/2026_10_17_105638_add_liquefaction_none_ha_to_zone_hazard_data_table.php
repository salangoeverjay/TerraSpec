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
        // "None" column of CLUP Table PF-26, so liquefaction shares use the table's own barangay total
        Schema::table('zone_hazard_data', function (Blueprint $table) {
            $table->decimal('liquefaction_none_ha', 10, 2)->default(0)->after('liquefaction_msa_ha');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('zone_hazard_data', function (Blueprint $table) {
            $table->dropColumn('liquefaction_none_ha');
        });
    }
};
