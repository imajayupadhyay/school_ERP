<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class School extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'email',
        'phone',
        'alternate_phone',
        'website',
        'address',
        'address_line2',
        'city',
        'state',
        'postal_code',
        'country',
        'timezone',
        'date_format',
        'currency',
        'academic_year_start_month',
        'board_affiliation',
        'registration_number',
        'udise_code',
        'principal_name',
        'established_year',
        'logo_path',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'academic_year_start_month' => 'integer',
            'established_year' => 'integer',
        ];
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<Student, $this> */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    /** @return HasMany<Guardian, $this> */
    public function guardians(): HasMany
    {
        return $this->hasMany(Guardian::class);
    }
}
