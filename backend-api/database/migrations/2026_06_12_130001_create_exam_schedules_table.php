<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->date('exam_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->decimal('max_marks', 8, 2);
            $table->decimal('passing_marks', 8, 2);
            $table->string('room')->nullable();
            $table->string('status')->default('scheduled');
            $table->timestamps();

            $table->unique(
                ['school_id', 'exam_id', 'class_id', 'section_id', 'subject_id'],
                'exam_schedule_unique_subject_scope',
            );
            $table->index(['school_id', 'exam_id']);
            $table->index(['school_id', 'class_id', 'section_id']);
            $table->index(['school_id', 'subject_id']);
            $table->index(['school_id', 'exam_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_schedules');
    }
};
