<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolClass extends Model
{
    use BelongsToSchool, HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'school_id',
        'name',
        'sequence',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
        ];
    }

    /** @return HasMany<Section, $this> */
    public function sections(): HasMany
    {
        return $this->hasMany(Section::class, 'class_id');
    }

    /** @return BelongsToMany<Subject, $this> */
    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'class_subject', 'class_id', 'subject_id')->withTimestamps();
    }
}
