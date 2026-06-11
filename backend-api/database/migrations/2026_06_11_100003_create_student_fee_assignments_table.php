<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_fee_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_structure_id')->nullable()->constrained()->nullOnDelete();
            // active | cancelled
            $table->string('status')->default('active');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'student_id', 'academic_session_id'], 'sfa_scope_index');
            $table->index(['school_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_fee_assignments');
    }
};
