<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('employee_code');
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('gender')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('employee_type')->default('teaching');
            $table->string('designation')->nullable();
            $table->string('department')->nullable();
            $table->string('employment_type')->default('full_time');
            $table->date('joining_date')->nullable();
            $table->string('qualification')->nullable();
            $table->decimal('experience_years', 4, 1)->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('alternate_phone')->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->string('status')->default('active');
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['school_id', 'employee_code']);
            $table->unique(['school_id', 'email']);
            $table->index(['school_id', 'employee_type']);
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'department']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
