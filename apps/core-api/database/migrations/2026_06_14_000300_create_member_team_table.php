<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_team', function (Blueprint $table) {
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['team_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_team');
    }
};
