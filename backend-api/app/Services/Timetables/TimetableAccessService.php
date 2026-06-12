<?php

namespace App\Services\Timetables;

use App\Models\EmployeeAssignment;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Resolves who may see which timetables. Managers (school_admin/principal/
 * super_admin) see everything. Teachers get a read-only view of published
 * timetables for the class/section scopes they are assigned to via
 * `employee_assignments` — writes stay gated by the `permission:` middleware.
 */
class TimetableAccessService
{
    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function isManager(User $user): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    /**
     * @param  Builder<Timetable>  $query
     * @return Builder<Timetable>
     */
    public function applyVisibleScope(Builder $query, User $user): Builder
    {
        if ($this->isManager($user)) {
            return $query;
        }

        $assignments = $this->teacherAssignments($user);

        if ($assignments->isEmpty()) {
            return $query->whereRaw('1 = 0');
        }

        return $query
            ->where('status', 'published')
            ->where(function (Builder $outer) use ($assignments) {
                foreach ($assignments as $assignment) {
                    $outer->orWhere(function (Builder $inner) use ($assignment) {
                        $inner->where('class_id', $assignment->class_id);

                        if ($assignment->section_id !== null) {
                            $inner->where('section_id', $assignment->section_id);
                        }
                    });
                }
            });
    }

    public function canView(User $user, Timetable $timetable): bool
    {
        if ($this->isManager($user)) {
            return true;
        }

        $query = Timetable::query()->whereKey($timetable->id);

        return $this->applyVisibleScope($query, $user)->exists();
    }

    /**
     * @return \Illuminate\Support\Collection<int, EmployeeAssignment>
     */
    private function teacherAssignments(User $user)
    {
        return EmployeeAssignment::query()
            ->where('status', 'active')
            ->whereHas('employee', function (Builder $inner) use ($user) {
                $inner->where('user_id', $user->id)->where('status', 'active');
            })
            ->get(['class_id', 'section_id']);
    }
}
