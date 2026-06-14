<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availabilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->constrained()->cascadeOnDelete();
            $table->string('kind'); // available | unavailable

            // Recurring weekly window (null recurrence = one-off entry).
            $table->string('recurrence')->nullable();
            $table->jsonb('days')->nullable();              // ISO weekdays, start day
            $table->time('start_time')->nullable();         // null/null = all day
            $table->time('end_time')->nullable();           // end < start = overnight

            // One-off span (handles any cross-midnight / multi-day window).
            $table->timestamp('start_at')->nullable();
            $table->timestamp('end_at')->nullable();

            $table->string('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availabilities');
    }
};
