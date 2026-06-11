<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_fee_assignment_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_no');
            $table->string('period_label');
            $table->date('due_date');
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->decimal('paid_amount', 10, 2)->default(0);
            // pending | partial | paid | cancelled
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->unique(['school_id', 'invoice_no']);
            $table->index(['school_id', 'student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_invoices');
    }
};
