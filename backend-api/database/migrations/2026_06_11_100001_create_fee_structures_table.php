<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['school_id', 'academic_session_id', 'class_id', 'name'], 'fee_structures_scope_name_unique');
            $table->index(['school_id', 'academic_session_id', 'class_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_structures');
    }
};
