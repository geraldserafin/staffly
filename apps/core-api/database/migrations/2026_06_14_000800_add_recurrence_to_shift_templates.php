<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            // Null = non-recurring template (used only for ad-hoc shift creation).
            $table->string('recurrence_frequency')->nullable()->after('end_time');
            // weekly: ISO weekdays 1-7; monthly: days of month 1-31.
            $table->jsonb('recurrence_days')->nullable()->after('recurrence_frequency');
        });
    }

    public function down(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->dropColumn(['recurrence_frequency', 'recurrence_days']);
        });
    }
};
