<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_structure_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_structure_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_head_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2)->default(0);
            // one_time | monthly | quarterly | half_yearly | annual
            $table->string('frequency')->default('annual');
            $table->boolean('is_optional')->default(false);
            $table->timestamps();

            $table->index(['school_id', 'fee_structure_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_structure_items');
    }
};
