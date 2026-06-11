<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentFeeAssignment extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'student_id',
        'academic_session_id',
        'fee_structure_id',
        'status',
        'notes',
    ];

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

    /** @return BelongsTo<AcademicSession, $this> */
    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    /** @return BelongsTo<FeeStructure, $this> */
    public function feeStructure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class);
    }

    /** @return HasMany<StudentFeeItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(StudentFeeItem::class);
    }

    /** @return HasMany<FeeInvoice, $this> */
    public function invoices(): HasMany
    {
        return $this->hasMany(FeeInvoice::class);
    }
}
