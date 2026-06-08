<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('admission_no')->nullable();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('gender')->nullable(); // male | female | other
            $table->date('date_of_birth')->nullable();
            $table->string('class_name')->nullable(); // e.g. "Grade 5"
            $table->string('section')->nullable();    // e.g. "A"
            $table->string('roll_no')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->string('status')->default('active'); // active | inactive | alumni
            $table->date('admission_date')->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'admission_no']);
            $table->index(['school_id', 'class_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
