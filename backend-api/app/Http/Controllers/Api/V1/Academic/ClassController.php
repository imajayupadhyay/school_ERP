<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Controllers\Controller;
use App\Http\Requests\Academic\ClassRequest;
use App\Http\Resources\Academic\ClassResource;
use App\Models\SchoolClass;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $classes = SchoolClass::with(['sections', 'subjects'])
            ->orderBy('sequence')
            ->orderBy('name')
            ->get();

        return $this->ok(ClassResource::collection($classes));
    }

    public function store(ClassRequest $request): JsonResponse
    {
        $class = SchoolClass::create($request->validated())->refresh();

        $this->auditLogger->log(
            school: $request->user()->school,
            user: $request->user(),
            action: 'class.created',
            changes: $request->validated(),
            auditable: $class,
            ipAddress: $request->ip(),
        );

        return $this->created(new ClassResource($class), 'Class created.');
    }

    public function update(ClassRequest $request, SchoolClass $class): JsonResponse
    {
        $original = $class->only(array_keys($request->validated()));

        $class->update($request->validated());

        $changes = $this->auditLogger->diff($original, $class->only(array_keys($request->validated())));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $request->user()->school,
                user: $request->user(),
                action: 'class.updated',
                changes: $changes,
                auditable: $class,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new ClassResource($class), 'Class updated.');
    }

    public function destroy(Request $request, SchoolClass $class): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['school_admin', 'principal', 'super_admin'], true)) {
            return $this->fail('You do not have permission to delete classes.', 403);
        }

        $class->delete();

        $this->auditLogger->log(
            school: $user->school,
            user: $user,
            action: 'class.deleted',
            changes: ['name' => $class->name],
            auditable: $class,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Class deleted.');
    }
}
