<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use BelongsToSchool, HasFactory, SoftDeletes;

    protected $fillable = [
        'school_id',
        'user_id',
        'employee_code',
        'first_name',
        'last_name',
        'gender',
        'date_of_birth',
        'employee_type',
        'designation',
        'department',
        'employment_type',
        'joining_date',
        'qualification',
        'experience_years',
        'email',
        'phone',
        'alternate_phone',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'status',
    ];

    protected $appends = [
        'full_name',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'joining_date' => 'date',
            'experience_years' => 'decimal:1',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name.' '.($this->last_name ?? ''));
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<School, $this> */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /** @return HasMany<EmployeeAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(EmployeeAssignment::class);
    }
}
