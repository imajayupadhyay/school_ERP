<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notice_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('notice_id')->constrained()->cascadeOnDelete();
            $table->string('target_type');
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('target_value')->nullable();
            $table->string('target_label');
            $table->timestamps();

            $table->index(['school_id', 'target_type', 'target_id']);
            $table->index(['school_id', 'target_type', 'target_value']);
            $table->index(['notice_id', 'target_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notice_targets');
    }
};
