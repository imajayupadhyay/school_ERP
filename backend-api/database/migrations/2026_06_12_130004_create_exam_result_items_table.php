<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_result_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_result_id')->constrained('exam_results')->cascadeOnDelete();
            $table->foreignId('exam_schedule_id')->nullable()->constrained('exam_schedules')->nullOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->string('subject_name');
            $table->decimal('max_marks', 8, 2);
            $table->decimal('passing_marks', 8, 2);
            $table->decimal('marks_obtained', 8, 2)->nullable();
            $table->string('attendance_status')->default('present');
            $table->string('grade')->nullable();
            $table->string('result_status')->default('incomplete');
            $table->timestamps();

            $table->unique(['school_id', 'exam_result_id', 'exam_schedule_id'], 'exam_result_item_unique_schedule');
            $table->index(['school_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_result_items');
    }
};
