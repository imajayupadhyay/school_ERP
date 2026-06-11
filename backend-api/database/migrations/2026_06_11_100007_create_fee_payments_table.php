<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->string('receipt_no');
            $table->decimal('amount', 10, 2)->default(0);
            // cash | cheque | online | card | upi | bank_transfer
            $table->string('mode')->default('cash');
            $table->string('reference_no')->nullable();
            $table->date('paid_on');
            $table->foreignId('collected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('remarks')->nullable();
            // completed | cancelled
            $table->string('status')->default('completed');
            $table->timestamps();

            $table->unique(['school_id', 'receipt_no']);
            $table->index(['school_id', 'student_id']);
            $table->index(['school_id', 'fee_invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_payments');
    }
};
