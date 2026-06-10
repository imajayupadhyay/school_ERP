<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guardians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('relation')->nullable();
            $table->string('phone')->nullable();
            $table->string('alternate_phone')->nullable();
            $table->string('email')->nullable();
            $table->string('occupation')->nullable();
            $table->text('address')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index(['school_id', 'name']);
            $table->index(['school_id', 'phone']);
            $table->index(['school_id', 'email']);
            $table->index(['school_id', 'status']);
        });

        Schema::create('guardian_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guardian_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('relationship')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_emergency_contact')->default(false);
            $table->boolean('pickup_allowed')->default(true);
            $table->timestamps();

            $table->unique(['guardian_id', 'student_id']);
            $table->index(['school_id', 'student_id']);
            $table->index(['school_id', 'guardian_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guardian_student');
        Schema::dropIfExists('guardians');
    }
};
