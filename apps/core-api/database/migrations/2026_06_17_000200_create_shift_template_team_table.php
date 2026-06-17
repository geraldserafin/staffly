<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A template now applies to many teams. No rows = applies to ALL the org's
        // teams (shared by default); rows = scoped to exactly those teams.
        Schema::create('shift_template_team', function (Blueprint $table) {
            $table->foreignUuid('shift_template_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['shift_template_id', 'team_id']);
        });

        // Replaces the single nullable team_id scope.
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('team_id');
        });
    }

    public function down(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->foreignUuid('team_id')->nullable()->constrained()->cascadeOnDelete();
        });

        Schema::dropIfExists('shift_template_team');
    }
};
