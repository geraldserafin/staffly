<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_template_requirements', function (Blueprint $table) {
            // Null = applies on every day the template runs; set = only these ISO
            // weekdays (additive, e.g. +1 cook on Mon/Fri for a shipment).
            $table->jsonb('days')->nullable()->after('count');
        });
    }

    public function down(): void
    {
        Schema::table('shift_template_requirements', function (Blueprint $table) {
            $table->dropColumn('days');
        });
    }
};
