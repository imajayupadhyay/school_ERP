<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('period_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('sequence');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->boolean('is_break')->default(false);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['school_id', 'sequence']);
            $table->index(['school_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_slots');
    }
};
