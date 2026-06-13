<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Period slots used to be school-wide (one bell schedule per school). They
     * become per-class: a slot with `class_id = NULL` is part of the school
     * DEFAULT template; a slot scoped to a class overrides the default for that
     * class only. "Effective slots for a class" = its own slots if any, else the
     * default set.
     *
     * NOTE on uniqueness: MySQL treats each NULL as distinct in a UNIQUE index,
     * so the composite index below only guarantees per-class (non-null) rows are
     * sequence-unique. Default-set (class_id IS NULL) sequence uniqueness is
     * enforced in PeriodSlotRequest at the application layer.
     */
    public function up(): void
    {
        Schema::table('period_slots', function (Blueprint $table) {
            $table->foreignId('class_id')->nullable()->after('school_id')
                ->constrained('classes')->cascadeOnDelete();

            $table->dropUnique(['school_id', 'sequence']);
            $table->unique(['school_id', 'class_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::table('period_slots', function (Blueprint $table) {
            $table->dropUnique(['school_id', 'class_id', 'sequence']);
            $table->dropForeign(['class_id']);
            $table->dropColumn('class_id');
            $table->unique(['school_id', 'sequence']);
        });
    }
};
