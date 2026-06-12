<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('homework_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->nullable()->constrained('academic_sessions')->nullOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('instructions')->nullable();
            $table->date('assigned_date');
            $table->date('due_date')->nullable();
            $table->boolean('submission_required')->default(true);
            $table->string('attachment_path')->nullable();
            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'academic_session_id']);
            $table->index(['school_id', 'class_id', 'section_id']);
            $table->index(['school_id', 'subject_id']);
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('homework_assignments');
    }
};
