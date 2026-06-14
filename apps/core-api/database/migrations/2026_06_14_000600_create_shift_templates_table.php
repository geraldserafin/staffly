<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            // Null team = shared across the org's teams; set = scoped to one team.
            $table->foreignUuid('team_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            // Times only; end < start means the shift crosses midnight (overnight).
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_templates');
    }
};
