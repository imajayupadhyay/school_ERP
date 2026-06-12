<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained('academic_sessions')->cascadeOnDelete();
            $table->string('name');
            $table->string('exam_type')->default('term');
            $table->date('start_date');
            $table->date('end_date');
            $table->text('description')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();

            $table->unique(['school_id', 'academic_session_id', 'name']);
            $table->index(['school_id', 'academic_session_id']);
            $table->index(['school_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
