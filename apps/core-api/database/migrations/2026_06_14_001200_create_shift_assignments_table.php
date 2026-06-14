<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('scheduled_shift_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained()->cascadeOnDelete();
            // Pin a manual choice so the solver keeps it fixed on re-solve.
            $table->boolean('locked')->default(false);
            $table->timestamps();

            $table->unique(['scheduled_shift_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_assignments');
    }
};
