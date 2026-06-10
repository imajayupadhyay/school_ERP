<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Controllers\Controller;
use App\Http\Requests\Academic\SubjectRequest;
use App\Http\Requests\Academic\SyncSubjectClassesRequest;
use App\Http\Resources\Academic\SubjectResource;
use App\Models\Subject;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $subjects = Subject::with('classes')->orderBy('name')->get();

        return $this->ok(SubjectResource::collection($subjects));
    }

    public function store(SubjectRequest $request): JsonResponse
    {
        $subject = Subject::create($request->validated())->refresh();

        $this->auditLogger->log(
            school: $request->user()->school,
            user: $request->user(),
            action: 'subject.created',
            changes: $request->validated(),
            auditable: $subject,
            ipAddress: $request->ip(),
        );

        return $this->created(new SubjectResource($subject), 'Subject created.');
    }

    public function update(SubjectRequest $request, Subject $subject): JsonResponse
    {
        $original = $subject->only(array_keys($request->validated()));

        $subject->update($request->validated());

        $changes = $this->auditLogger->diff($original, $subject->only(array_keys($request->validated())));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $request->user()->school,
                user: $request->user(),
                action: 'subject.updated',
                changes: $changes,
                auditable: $subject,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new SubjectResource($subject), 'Subject updated.');
    }

    public function destroy(Request $request, Subject $subject): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['school_admin', 'principal', 'super_admin'], true)) {
            return $this->fail('You do not have permission to delete subjects.', 403);
        }

        $subject->delete();

        $this->auditLogger->log(
            school: $user->school,
            user: $user,
            action: 'subject.deleted',
            changes: ['name' => $subject->name],
            auditable: $subject,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Subject deleted.');
    }

    public function syncClasses(SyncSubjectClassesRequest $request, Subject $subject): JsonResponse
    {
        $classIds = $request->validated('class_ids');
        $schoolId = $request->user()->school_id;

        $sync = collect($classIds)->mapWithKeys(fn (int $classId) => [
            $classId => ['school_id' => $schoolId],
        ])->all();

        $subject->classes()->sync($sync);

        $this->auditLogger->log(
            school: $request->user()->school,
            user: $request->user(),
            action: 'subject.classes_synced',
            changes: ['class_ids' => $classIds],
            auditable: $subject,
            ipAddress: $request->ip(),
        );

        return $this->ok(new SubjectResource($subject->fresh('classes')), 'Subject class assignments updated.');
    }
}
