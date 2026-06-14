<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_template_requirements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('shift_template_id')->constrained()->cascadeOnDelete();
            // Null skill = "Any" (only valid for headcount lines).
            $table->foreignUuid('skill_id')->nullable()->constrained()->cascadeOnDelete();
            // headcount = consumes distinct people; coverage = capability must be present.
            $table->string('type');
            // Used by headcount lines; null for coverage.
            $table->unsignedInteger('count')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_template_requirements');
    }
};
