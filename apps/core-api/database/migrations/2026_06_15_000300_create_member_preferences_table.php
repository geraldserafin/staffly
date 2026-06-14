<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->jsonb('params')->nullable();
            // Employee-set: relative importance among their own soft preferences.
            $table->unsignedTinyInteger('weight')->default(3);
            // Employee-requested; effective-hard only when hard_approved.
            $table->string('mode')->default('soft');
            // Manager-set gate for hard preferences.
            $table->boolean('hard_approved')->default(false);
            $table->timestamps();

            $table->unique(['member_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_preferences');
    }
};
