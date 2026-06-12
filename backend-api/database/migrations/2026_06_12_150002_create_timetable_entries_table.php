<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timetable_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('timetable_id')->constrained('timetables')->cascadeOnDelete();
            $table->foreignId('period_slot_id')->constrained('period_slots')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 1=Mon ... 6=Sat
            $table->timestamps();

            $table->unique(
                ['timetable_id', 'day_of_week', 'period_slot_id'],
                'timetable_entry_unique_cell',
            );
            $table->index(['school_id', 'employee_id', 'day_of_week', 'period_slot_id'], 'timetable_entry_teacher_slot');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timetable_entries');
    }
};
