<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // preferred_shift_type now references shift templates by id, not a free
        // text category, so the column is no longer used anywhere.
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->dropColumn('category');
        });

        Schema::table('scheduled_shifts', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->string('category')->nullable()->after('name');
        });

        Schema::table('scheduled_shifts', function (Blueprint $table) {
            $table->string('category')->nullable()->after('name');
        });
    }
};
