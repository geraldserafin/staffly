<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('team_id')->unique()->constrained()->cascadeOnDelete();
            // Hard legal/safety limits; null = unconstrained.
            $table->unsignedInteger('min_rest_hours')->nullable();
            $table->unsignedInteger('max_hours_per_week')->nullable();
            $table->unsignedInteger('max_consecutive_days')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_rules');
    }
};
