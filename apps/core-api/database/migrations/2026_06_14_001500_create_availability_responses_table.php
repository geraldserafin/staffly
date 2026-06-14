<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availability_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('availability_request_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['availability_request_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_responses');
    }
};
