<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_skill', function (Blueprint $table) {
            $table->foreignUuid('member_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('skill_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['member_id', 'skill_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_skill');
    }
};
