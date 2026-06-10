<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Mandatory for every model that stores school-owned data (students, fees,
 * attendance, exams, etc.).
 *
 * - Automatically scopes ALL queries to the authenticated user's `school_id`,
 *   so a forgotten `where('school_id', ...)` can no longer leak data across
 *   tenants.
 * - Automatically stamps `school_id` on new records from the authenticated
 *   user, so it never has to be passed in manually (or trusted from the
 *   frontend).
 * - Platform Super Admin (`school_id` is null) is NOT scoped, so platform
 *   dashboards/reports can see data across all schools.
 * - Console commands, jobs, and seeders run without an authenticated user,
 *   so the scope is skipped there too — those contexts must set `school_id`
 *   explicitly.
 */
trait BelongsToSchool
{
    protected static function bootBelongsToSchool(): void
    {
        static::addGlobalScope('school', function (Builder $builder) {
            $user = Auth::user();

            if ($user !== null && $user->school_id !== null) {
                $builder->where($builder->getModel()->getTable().'.school_id', $user->school_id);
            }
        });

        static::creating(function (Model $model) {
            $user = Auth::user();

            if (empty($model->school_id) && $user !== null && $user->school_id !== null) {
                $model->school_id = $user->school_id;
            }
        });
    }

    /** Explicitly scope to a given school, regardless of the authenticated user. */
    public function scopeForSchool(Builder $query, int $schoolId): Builder
    {
        return $query->withoutGlobalScope('school')->where('school_id', $schoolId);
    }

    /** Explicitly query across all schools. Platform Super Admin use only. */
    public function scopeAllSchools(Builder $query): Builder
    {
        return $query->withoutGlobalScope('school');
    }
}
