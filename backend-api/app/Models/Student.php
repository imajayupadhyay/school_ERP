<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'academic_session_id',
        'admission_no',
        'admission_type',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'date_of_birth',
        'class_id',
        'section_id',
        'class_name',
        'section',
        'roll_no',
        'house',
        'category',
        'religion',
        'blood_group',
        'nationality',
        'mother_tongue',
        'photo_path',
        'primary_phone',
        'primary_email',
        'current_address',
        'permanent_address',
        'city',
        'state',
        'postal_code',
        'country',
        'guardian_name',
        'guardian_phone',
        'emergency_contact_name',
        'emergency_contact_relation',
        'emergency_contact_phone',
        'medical_conditions',
        'allergies',
        'medications',
        'doctor_name',
        'doctor_phone',
        'previous_school_name',
        'previous_school_board',
        'previous_school_class',
        'previous_school_transfer_certificate_no',
        'status',
        'admission_date',
        'transfer_date',
        'transfer_reason',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'admission_date' => 'date',
            'transfer_date' => 'date',
        ];
    }

    /** @return BelongsTo<School, $this> */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /** @return BelongsTo<AcademicSession, $this> */
    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    /** @return BelongsTo<SchoolClass, $this> */
    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    /** @return BelongsTo<Section, $this> */
    public function schoolSection(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    /** @return BelongsToMany<Guardian, $this> */
    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'guardian_student')
            ->withPivot(['school_id', 'relationship', 'is_primary', 'is_emergency_contact', 'pickup_allowed'])
            ->withTimestamps();
    }

    /** @return HasMany<StudentFeeAssignment, $this> */
    public function feeAssignments(): HasMany
    {
        return $this->hasMany(StudentFeeAssignment::class);
    }

    /** @return HasMany<FeeInvoice, $this> */
    public function feeInvoices(): HasMany
    {
        return $this->hasMany(FeeInvoice::class);
    }

    /** @return HasMany<AttendanceRecord, $this> */
    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    /** @return HasMany<ExamMark, $this> */
    public function examMarks(): HasMany
    {
        return $this->hasMany(ExamMark::class);
    }

    /** @return HasMany<ExamResult, $this> */
    public function examResults(): HasMany
    {
        return $this->hasMany(ExamResult::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim(collect([$this->first_name, $this->middle_name, $this->last_name])
            ->filter()
            ->implode(' '));
    }
}
