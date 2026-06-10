<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Student extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'admission_no',
        'first_name',
        'last_name',
        'gender',
        'date_of_birth',
        'class_name',
        'section',
        'roll_no',
        'guardian_name',
        'guardian_phone',
        'status',
        'admission_date',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'admission_date' => 'date',
        ];
    }

    /** @return BelongsTo<School, $this> */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
