<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tenant-scoped roles: seeded system roles + admin-created custom roles.
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('is_owner')->default(false);   // full access, locked matrix
            $table->boolean('is_protected')->default(false); // cannot be deleted
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['school_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
