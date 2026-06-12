<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timetables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['school_id', 'academic_session_id', 'class_id', 'section_id'],
                'timetable_unique_class_section_scope',
            );
            $table->index(['school_id', 'academic_session_id']);
            $table->index(['school_id', 'class_id', 'section_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timetables');
    }
};
