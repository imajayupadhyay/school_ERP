<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_head_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label');
            $table->decimal('amount', 10, 2)->default(0);
            $table->timestamps();

            $table->index(['school_id', 'fee_invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_invoice_items');
    }
};
