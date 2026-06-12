<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\EmployeeAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class AttendanceService
{
    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function canAccessRoster(User $user, int $classId, ?int $sectionId): bool
    {
        if (in_array($user->role, self::MANAGER_ROLES, true)) {
            return true;
        }

        if ($user->role !== 'teacher') {
            return false;
        }

        return EmployeeAssignment::query()
            ->where('class_id', $classId)
            ->where('status', 'active')
            ->whereHas('employee', function (Builder $query) use ($user) {
                $query->where('user_id', $user->id)->where('status', 'active');
            })
            ->where(function (Builder $query) use ($sectionId) {
                $query->whereNull('section_id');

                if ($sectionId !== null) {
                    $query->orWhere('section_id', $sectionId);
                }
            })
            ->exists();
    }

    /**
     * @param  Builder<AttendanceSession>  $query
     * @return Builder<AttendanceSession>
     */
    public function applyVisibleSessionScope(Builder $query, User $user): Builder
    {
        if (in_array($user->role, self::MANAGER_ROLES, true)) {
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
            ->get(['class_id', 'section_id']);

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
                });
            }
        });
    }

    /**
     * Replace a class/section daily roster with the submitted records.
     *
     * @param  array<string, mixed>  $validated
     */
    public function mark(array $validated, User $marker): AttendanceSession
    {
        return DB::transaction(function () use ($validated, $marker) {
            $session = AttendanceSession::query()
                ->where('school_id', $marker->school_id)
                ->where('academic_session_id', $validated['academic_session_id'])
                ->where('class_id', $validated['class_id'])
                ->where('section_id', $validated['section_id'] ?? null)
                ->whereDate('attendance_date', $validated['attendance_date'])
                ->first();

            if ($session === null) {
                $session = new AttendanceSession([
                    'school_id' => $marker->school_id,
                    'academic_session_id' => $validated['academic_session_id'],
                    'class_id' => $validated['class_id'],
                    'section_id' => $validated['section_id'] ?? null,
                    'attendance_date' => $validated['attendance_date'],
                ]);
            }

            $session->fill([
                'marked_by' => $marker->id,
                'status' => $validated['status'] ?? 'submitted',
                'remarks' => $validated['remarks'] ?? null,
            ]);
            $session->save();

            $keptStudentIds = [];

            foreach ($validated['records'] as $record) {
                $keptStudentIds[] = (int) $record['student_id'];

                AttendanceRecord::query()->updateOrCreate(
                    [
                        'school_id' => $marker->school_id,
                        'attendance_session_id' => $session->id,
                        'student_id' => $record['student_id'],
                    ],
                    [
                        'status' => $record['status'],
                        'remarks' => $record['remarks'] ?? null,
                    ],
                );
            }

            AttendanceRecord::query()
                ->where('attendance_session_id', $session->id)
                ->whereNotIn('student_id', $keptStudentIds)
                ->delete();

            return $session->refresh();
        });
    }
}
