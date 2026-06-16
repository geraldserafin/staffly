<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solve_runs', function (Blueprint $table) {
            // The assignments this run produced — retained so runs can be compared
            // side by side and a chosen one re-applied, even after a later re-solve
            // overwrote the live draft. [{ shiftId, memberId }].
            $table->jsonb('result_snapshot')->nullable()->after('diagnostics');
        });
    }

    public function down(): void
    {
        Schema::table('solve_runs', function (Blueprint $table) {
            $table->dropColumn('result_snapshot');
        });
    }
};
