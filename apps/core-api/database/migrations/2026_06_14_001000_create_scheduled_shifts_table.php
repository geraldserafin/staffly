<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scheduled_shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('schedule_id')->constrained()->cascadeOnDelete();
            // Origin template (snapshot, not a live link); kept if template is deleted.
            $table->foreignUuid('shift_template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            // Full datetimes so overnight shifts (end next day) are unambiguous.
            $table->timestamp('start_at');
            $table->timestamp('end_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_shifts');
    }
};
