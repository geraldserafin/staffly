<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_satisfaction', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->constrained()->cascadeOnDelete();
            // Scope: history is per team. Kept denormalised so it survives the
            // origin schedule being deleted (the schedule FK is a snapshot tag).
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('schedule_id')->nullable()->constrained()->nullOnDelete();
            // Period the record covers — drives recency ordering and decay.
            $table->date('period_start');
            $table->date('period_end');
            // Realised dissatisfaction (solver WD[m], fixed-point). Higher = worse off.
            $table->unsignedBigInteger('dissatisfaction')->default(0);
            $table->timestamps();

            // One record per (schedule, member) — re-publishing updates in place.
            $table->unique(['schedule_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_satisfaction');
    }
};
