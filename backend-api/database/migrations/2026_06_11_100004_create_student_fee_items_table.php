<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_fee_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_fee_assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_head_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label');
            $table->decimal('base_amount', 10, 2)->default(0);
            // one_time | monthly | quarterly | half_yearly | annual
            $table->string('frequency')->default('annual');
            // none | percent | fixed
            $table->string('discount_type')->default('none');
            $table->decimal('discount_value', 10, 2)->default(0);
            $table->string('discount_reason')->nullable();
            $table->boolean('is_custom')->default(false);
            $table->boolean('is_optional')->default(false);
            $table->timestamps();

            $table->index(['school_id', 'student_fee_assignment_id'], 'sfi_scope_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_fee_items');
    }
};
