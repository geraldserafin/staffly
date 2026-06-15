<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Hours of rest required after this shift before the member's next one.
        // Null = fall back to the team's min_rest_hours (or no constraint).
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->unsignedInteger('rest_hours_after')->nullable()->after('end_time');
        });

        Schema::table('scheduled_shifts', function (Blueprint $table) {
            $table->unsignedInteger('rest_hours_after')->nullable()->after('end_at');
        });
    }

    public function down(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->dropColumn('rest_hours_after');
        });

        Schema::table('scheduled_shifts', function (Blueprint $table) {
            $table->dropColumn('rest_hours_after');
        });
    }
};
