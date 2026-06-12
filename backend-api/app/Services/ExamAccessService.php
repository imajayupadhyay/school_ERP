<?php

namespace App\Services;

use App\Models\EmployeeAssignment;
use App\Models\ExamSchedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ExamAccessService
{
    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function isManager(User $user): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    public function canAccessSchedule(User $user, ExamSchedule $schedule): bool
    {
        if ($this->isManager($user)) {
            return true;
        }

        if ($user->role !== 'teacher') {
            return false;
        }

        return EmployeeAssignment::query()
            ->where('class_id', $schedule->class_id)
            ->where('status', 'active')
            ->whereHas('employee', function (Builder $query) use ($user) {
                $query->where('user_id', $user->id)->where('status', 'active');
            })
            ->where(function (Builder $query) use ($schedule) {
                $query->whereNull('section_id');

                if ($schedule->section_id !== null) {
                    $query->orWhere('section_id', $schedule->section_id);
                }
            })
            ->where(function (Builder $query) use ($schedule) {
                $query->where('assignment_type', 'class_teacher')
                    ->orWhere(function (Builder $inner) use ($schedule) {
                        $inner
                            ->where('assignment_type', 'subject_teacher')
                            ->where('subject_id', $schedule->subject_id);
                    });
            })
            ->exists();
    }

    /**
     * @param  Builder<ExamSchedule>  $query
     * @return Builder<ExamSchedule>
     */
    public function applyVisibleScheduleScope(Builder $query, User $user): Builder
    {
        if ($this->isManager($user)) {
            return $query;
        }

        if ($user->role !== 'teacher') {
            return $query->whereRaw('1 = 0');
        }

        $assignments = EmployeeAssignment::query()
            ->where('status', 'active')
            ->whereHas('employee', function (Builder $inner) use ($user) {
                $inner->where('user_id', $user->id)->where('status', 'active');
            })
            ->get(['assignment_type', 'class_id', 'section_id', 'subject_id']);

        if ($assignments->isEmpty()) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $outer) use ($assignments) {
            foreach ($assignments as $assignment) {
                $outer->orWhere(function (Builder $inner) use ($assignment) {
                    $inner->where('class_id', $assignment->class_id);

                    if ($assignment->section_id !== null) {
                        $inner->where('section_id', $assignment->section_id);
                    }

                    if ($assignment->assignment_type === 'subject_teacher') {
                        $inner->where('subject_id', $assignment->subject_id);
                    }
                });
            }
        });
    }
}
