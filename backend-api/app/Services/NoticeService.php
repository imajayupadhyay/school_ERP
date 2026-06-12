<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeAssignment;
use App\Models\Guardian;
use App\Models\Notice;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class NoticeService
{
    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function isManager(User $user): bool
    {
        return in_array($user->role, self::MANAGER_ROLES, true);
    }

    /**
     * @param  Builder<Notice>  $query
     * @return Builder<Notice>
     */
    public function applyVisibleScope(Builder $query, User $user): Builder
    {
        if ($this->isManager($user)) {
            return $query;
        }

        $query
            ->where(function (Builder $publication) {
                $publication
                    ->where('status', 'published')
                    ->orWhere(function (Builder $scheduled) {
                        $scheduled
                            ->where('status', 'scheduled')
                            ->whereNotNull('publish_at')
                            ->where('publish_at', '<=', now());
                    });
            })
            ->where(function (Builder $expiry) {
                $expiry->whereNull('expires_at')->orWhere('expires_at', '>', now());
            });

        $employee = $user->employee;
        $guardian = $user->guardian;
        $assignments = $employee
            ? EmployeeAssignment::query()->where('employee_id', $employee->id)->where('status', 'active')->get()
            : collect();
        $students = $guardian
            ? $guardian->students()->where('students.status', 'active')->get(['students.id', 'students.class_id', 'students.section_id'])
            : collect();

        $classIds = $assignments->pluck('class_id')->merge($students->pluck('class_id'))->filter()->unique()->values();
        $classWideSectionIds = Section::query()
            ->whereIn('class_id', $assignments->whereNull('section_id')->pluck('class_id')->filter()->unique())
            ->pluck('id');
        $sectionIds = $assignments->pluck('section_id')
            ->merge($classWideSectionIds)
            ->merge($students->pluck('section_id'))
            ->filter()
            ->unique()
            ->values();
        $studentIds = $students->pluck('id')->filter()->unique()->values();

        return $query->whereHas('targets', function (Builder $targets) use (
            $user,
            $employee,
            $guardian,
            $classIds,
            $sectionIds,
            $studentIds,
        ) {
            $targets->where('target_type', 'school')
                ->orWhere(function (Builder $role) use ($user, $employee) {
                    $role->where('target_type', 'role')
                        ->where(function (Builder $values) use ($user, $employee) {
                            $values->where('target_value', $user->role);

                            if ($employee !== null) {
                                $values->orWhere('target_value', 'employee');
                            }
                        });
                });

            if ($employee !== null) {
                $targets->orWhere(fn (Builder $target) => $target
                    ->where('target_type', 'employee')
                    ->where('target_id', $employee->id));
            }

            if ($guardian !== null) {
                $targets->orWhere(fn (Builder $target) => $target
                    ->where('target_type', 'guardian')
                    ->where('target_id', $guardian->id));
            }

            if ($classIds->isNotEmpty()) {
                $targets->orWhere(fn (Builder $target) => $target
                    ->where('target_type', 'class')
                    ->whereIn('target_id', $classIds));
            }

            if ($sectionIds->isNotEmpty()) {
                $targets->orWhere(fn (Builder $target) => $target
                    ->where('target_type', 'section')
                    ->whereIn('target_id', $sectionIds));
            }

            if ($studentIds->isNotEmpty()) {
                $targets->orWhere(fn (Builder $target) => $target
                    ->where('target_type', 'student')
                    ->whereIn('target_id', $studentIds));
            }
        });
    }

    public function canView(User $user, Notice $notice): bool
    {
        if ($this->isManager($user)) {
            return true;
        }

        $query = Notice::query()->whereKey($notice->id);
        $this->applyVisibleScope($query, $user);

        return $query->exists();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function payload(array $validated, User $user, ?Notice $notice = null): array
    {
        $payload = collect($validated)
            ->only(['title', 'body', 'category', 'priority', 'status', 'publish_at', 'expires_at'])
            ->all();

        $payload['created_by'] = $notice?->created_by ?? $user->id;

        if ($payload['status'] === 'published') {
            $payload['publish_at'] = $payload['publish_at'] ?? $notice?->publish_at ?? now();
            $payload['published_at'] = $notice?->published_at ?? now();
            $payload['published_by'] = $user->id;
        } else {
            $payload['published_at'] = null;
            $payload['published_by'] = null;
        }

        if ($payload['status'] === 'draft') {
            $payload['publish_at'] = null;
        }

        return $payload;
    }

    /**
     * @param  array<int, array{type: string, id?: int|null, value?: string|null}>  $targets
     */
    public function syncTargets(Notice $notice, array $targets): void
    {
        $notice->targets()->delete();

        foreach ($targets as $target) {
            $notice->targets()->create([
                'school_id' => $notice->school_id,
                'target_type' => $target['type'],
                'target_id' => $target['id'] ?? null,
                'target_value' => $target['value'] ?? null,
                'target_label' => $this->targetLabel(
                    $notice->school_id,
                    $target['type'],
                    $target['id'] ?? null,
                    $target['value'] ?? null,
                ),
            ]);
        }
    }

    /**
     * @return Collection<int, int>
     */
    public function recipientUserIds(Notice $notice): Collection
    {
        $ids = collect();
        $notice->loadMissing('targets');

        foreach ($notice->targets as $target) {
            $query = User::query()
                ->where('school_id', $notice->school_id)
                ->where('status', 'active');

            $targetIds = match ($target->target_type) {
                'school' => $query->pluck('id'),
                'role' => $this->roleRecipients($query, (string) $target->target_value),
                'class' => $this->classRecipients($query, (int) $target->target_id, null),
                'section' => $this->classRecipients($query, null, (int) $target->target_id),
                'student' => $query
                    ->whereHas('guardian.students', fn (Builder $student) => $student->whereKey($target->target_id))
                    ->pluck('id'),
                'guardian' => $query
                    ->whereHas('guardian', fn (Builder $guardian) => $guardian->whereKey($target->target_id))
                    ->pluck('id'),
                'employee' => $query
                    ->whereHas('employee', fn (Builder $employee) => $employee->whereKey($target->target_id))
                    ->pluck('id'),
                default => collect(),
            };

            $ids = $ids->merge($targetIds);
        }

        return $ids->unique()->values();
    }

    /**
     * @param  Builder<User>  $query
     * @return Collection<int, int>
     */
    private function roleRecipients(Builder $query, string $role): Collection
    {
        if ($role === 'employee') {
            return $query
                ->whereHas('employee', fn (Builder $employee) => $employee->where('status', 'active'))
                ->pluck('id');
        }

        return $query->where('role', $role)->pluck('id');
    }

    /**
     * @param  Builder<User>  $query
     * @return Collection<int, int>
     */
    private function classRecipients(Builder $query, ?int $classId, ?int $sectionId): Collection
    {
        $sectionClassId = $sectionId !== null ? Section::query()->whereKey($sectionId)->value('class_id') : null;

        return $query
            ->where(function (Builder $audience) use ($classId, $sectionId, $sectionClassId) {
                $audience
                    ->whereHas('employee.assignments', function (Builder $assignment) use ($classId, $sectionId, $sectionClassId) {
                        $assignment->where('status', 'active');

                        if ($classId !== null) {
                            $assignment->where('class_id', $classId);
                        }

                        if ($sectionId !== null) {
                            $assignment->where(function (Builder $scope) use ($sectionId, $sectionClassId) {
                                $scope->where('section_id', $sectionId);

                                if ($sectionClassId !== null) {
                                    $scope->orWhere(function (Builder $classWide) use ($sectionClassId) {
                                        $classWide
                                            ->whereNull('section_id')
                                            ->where('class_id', $sectionClassId);
                                    });
                                }
                            });
                        }
                    })
                    ->orWhereHas('guardian.students', function (Builder $student) use ($classId, $sectionId) {
                        $student->where('students.status', 'active');

                        if ($classId !== null) {
                            $student->where('students.class_id', $classId);
                        }

                        if ($sectionId !== null) {
                            $student->where('students.section_id', $sectionId);
                        }
                    });
            })
            ->pluck('id');
    }

    private function targetLabel(int $schoolId, string $type, ?int $id, ?string $value): string
    {
        return match ($type) {
            'school' => 'Entire school',
            'role' => match ($value) {
                'teacher' => 'All teachers',
                'employee' => 'All employees',
                'parent' => 'All parents',
                'student' => 'All students',
                default => 'Role audience',
            },
            'class' => SchoolClass::forSchool($schoolId)->findOrFail($id)->name,
            'section' => $this->sectionLabel($schoolId, $id),
            'student' => Student::forSchool($schoolId)->findOrFail($id)->full_name,
            'guardian' => Guardian::forSchool($schoolId)->findOrFail($id)->name,
            'employee' => Employee::forSchool($schoolId)->findOrFail($id)->full_name,
            default => 'Audience',
        };
    }

    private function sectionLabel(int $schoolId, ?int $id): string
    {
        $section = Section::forSchool($schoolId)->with('schoolClass')->findOrFail($id);

        return "{$section->schoolClass->name} - Section {$section->name}";
    }
}
