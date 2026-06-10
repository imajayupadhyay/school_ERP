<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Controllers\Controller;
use App\Http\Requests\Academic\SectionRequest;
use App\Http\Resources\Academic\SectionResource;
use App\Models\Section;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Section::query()->orderBy('name');

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->integer('class_id'));
        }

        return $this->ok(SectionResource::collection($query->get()));
    }

    public function store(SectionRequest $request): JsonResponse
    {
        $section = Section::create($request->validated())->refresh();

        $this->auditLogger->log(
            school: $request->user()->school,
            user: $request->user(),
            action: 'section.created',
            changes: $request->validated(),
            auditable: $section,
            ipAddress: $request->ip(),
        );

        return $this->created(new SectionResource($section), 'Section created.');
    }

    public function update(SectionRequest $request, Section $section): JsonResponse
    {
        $original = $section->only(array_keys($request->validated()));

        $section->update($request->validated());

        $changes = $this->auditLogger->diff($original, $section->only(array_keys($request->validated())));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $request->user()->school,
                user: $request->user(),
                action: 'section.updated',
                changes: $changes,
                auditable: $section,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new SectionResource($section), 'Section updated.');
    }

    public function destroy(Request $request, Section $section): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['school_admin', 'principal', 'super_admin'], true)) {
            return $this->fail('You do not have permission to delete sections.', 403);
        }

        $section->delete();

        $this->auditLogger->log(
            school: $user->school,
            user: $user,
            action: 'section.deleted',
            changes: ['name' => $section->name, 'class_id' => $section->class_id],
            auditable: $section,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Section deleted.');
    }
}
