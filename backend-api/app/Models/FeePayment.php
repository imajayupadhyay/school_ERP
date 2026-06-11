<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeePayment extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'student_id',
        'fee_invoice_id',
        'receipt_no',
        'amount',
        'mode',
        'reference_no',
        'paid_on',
        'collected_by',
        'remarks',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_on' => 'date',
        ];
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

    /** @return BelongsTo<FeeInvoice, $this> */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(FeeInvoice::class, 'fee_invoice_id');
    }

    /** @return BelongsTo<User, $this> */
    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }
}
