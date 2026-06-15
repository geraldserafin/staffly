<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Arbitrary label (e.g. "day"/"night") matched by preferred_shift_type prefs.
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->string('category')->nullable()->after('name');
        });

        Schema::table('scheduled_shifts', function (Blueprint $table) {
            $table->string('category')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->dropColumn('category');
        });

        Schema::table('scheduled_shifts', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
