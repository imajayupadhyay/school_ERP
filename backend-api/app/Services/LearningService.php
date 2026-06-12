<?php

namespace App\Services;

use App\Models\EmployeeAssignment;
use App\Models\HomeworkAssignment;
use App\Models\StudyMaterial;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class LearningService
{
    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function canManageScope(User $user, int $classId, ?int $sectionId, ?int $subjectId): bool
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
            ->where(function (Builder $query) use ($subjectId) {
                $query->where('assignment_type', 'class_teacher');

                if ($subjectId !== null) {
                    $query->orWhere(function (Builder $inner) use ($subjectId) {
                        $inner
                            ->where('assignment_type', 'subject_teacher')
                            ->where('subject_id', $subjectId);
                    });
                }
            })
            ->exists();
    }

    public function canManageItem(User $user, HomeworkAssignment|StudyMaterial $item): bool
    {
        if (in_array($user->role, self::MANAGER_ROLES, true)) {
            return true;
        }

        if ($item->created_by === $user->id) {
            return true;
        }

        return $this->canManageScope($user, (int) $item->class_id, $item->section_id, $item->subject_id);
    }

    public function canViewItem(User $user, HomeworkAssignment|StudyMaterial $item): bool
    {
        return $this->canManageItem($user, $item);
    }

    /**
     * @param  Builder<Model>  $query
     * @return Builder<Model>
     */
    public function applyVisibleScope(Builder $query, User $user): Builder
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
            ->get(['assignment_type', 'class_id', 'section_id', 'subject_id']);

        return $query->where(function (Builder $outer) use ($assignments, $user) {
            $outer->where('created_by', $user->id);

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

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function homeworkPayload(array $validated, User $user, ?HomeworkAssignment $homework = null): array
    {
        $payload = collect($validated)
            ->only([
                'academic_session_id',
                'class_id',
                'section_id',
                'subject_id',
                'title',
                'instructions',
                'assigned_date',
                'due_date',
                'submission_required',
                'status',
            ])
            ->all();

        $payload['created_by'] = $homework?->created_by ?? $user->id;
        $payload['status'] = $payload['status'] ?? $homework?->status ?? 'draft';
        $payload['published_at'] = $this->publishedAt($payload['status'], $homework?->published_at);

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function materialPayload(array $validated, User $user, ?StudyMaterial $material = null): array
    {
        $payload = collect($validated)
            ->only([
                'academic_session_id',
                'class_id',
                'section_id',
                'subject_id',
                'title',
                'description',
                'material_type',
                'content_url',
                'status',
            ])
            ->all();

        $payload['created_by'] = $material?->created_by ?? $user->id;
        $payload['material_type'] = $payload['material_type'] ?? $material?->material_type ?? 'document';
        $payload['status'] = $payload['status'] ?? $material?->status ?? 'draft';
        $payload['published_at'] = $this->publishedAt($payload['status'], $material?->published_at);

        return $payload;
    }

    private function publishedAt(string $status, mixed $existing): mixed
    {
        if ($status !== 'published') {
            return null;
        }

        return $existing ?? now();
    }
}
