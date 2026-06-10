<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->string('assignment_type')->default('subject_teacher');
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index(['school_id', 'class_id']);
            $table->index(['school_id', 'section_id']);
            $table->index(['school_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_assignments');
    }
};
