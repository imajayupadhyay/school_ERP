<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentFeeItem extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'student_fee_assignment_id',
        'fee_head_id',
        'label',
        'base_amount',
        'frequency',
        'discount_type',
        'discount_value',
        'discount_reason',
        'is_custom',
        'is_optional',
    ];

    protected function casts(): array
    {
        return [
            'base_amount' => 'decimal:2',
            'discount_value' => 'decimal:2',
            'is_custom' => 'boolean',
            'is_optional' => 'boolean',
        ];
    }

    /**
     * Per-occurrence amount after applying the item's discount.
     * Discount applies to each occurrence (e.g. a percent off every monthly instalment).
     */
    public function getNetAmountAttribute(): float
    {
        $base = (float) $this->base_amount;
        $value = (float) $this->discount_value;

        $net = match ($this->discount_type) {
            'percent' => $base - ($base * min(max($value, 0), 100) / 100),
            'fixed' => $base - $value,
            default => $base,
        };

        return round(max($net, 0), 2);
    }

    /** @return BelongsTo<StudentFeeAssignment, $this> */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(StudentFeeAssignment::class, 'student_fee_assignment_id');
    }

    /** @return BelongsTo<FeeHead, $this> */
    public function feeHead(): BelongsTo
    {
        return $this->belongsTo(FeeHead::class);
    }
}
