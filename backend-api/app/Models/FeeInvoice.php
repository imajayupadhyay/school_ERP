<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeeInvoice extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'student_id',
        'student_fee_assignment_id',
        'invoice_no',
        'period_label',
        'due_date',
        'total_amount',
        'paid_amount',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
        ];
    }

    public function getBalanceAttribute(): float
    {
        return round((float) $this->total_amount - (float) $this->paid_amount, 2);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->status !== 'paid'
            && $this->status !== 'cancelled'
            && $this->balance > 0
            && $this->due_date !== null
            && $this->due_date->isPast();
    }

    /** @return BelongsTo<School, $this> */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /** @return BelongsTo<Student, $this> */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /** @return BelongsTo<StudentFeeAssignment, $this> */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(StudentFeeAssignment::class, 'student_fee_assignment_id');
    }

    /** @return HasMany<FeeInvoiceItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(FeeInvoiceItem::class);
    }

    /** @return HasMany<FeePayment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(FeePayment::class);
    }
}
