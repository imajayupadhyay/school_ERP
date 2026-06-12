<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->date('attendance_date');
            $table->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('submitted');
            $table->string('remarks')->nullable();
            $table->timestamps();

            $table->unique(
                ['school_id', 'academic_session_id', 'class_id', 'section_id', 'attendance_date'],
                'attendance_session_unique_daily_roster',
            );
            $table->index(['school_id', 'attendance_date']);
            $table->index(['school_id', 'class_id', 'section_id']);
            $table->index(['school_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
