<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_requirements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('scheduled_shift_id')->constrained()->cascadeOnDelete();
            // Snapshot of the template requirement at generation time.
            $table->foreignUuid('skill_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type');
            $table->unsignedInteger('count')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_requirements');
    }
};
