<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            // Seniority tier — manager-set. Scales the member's weight in the
            // solver's global objective (higher = preferences count more).
            $table->unsignedInteger('priority')->default(1)->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('priority');
        });
    }
};
