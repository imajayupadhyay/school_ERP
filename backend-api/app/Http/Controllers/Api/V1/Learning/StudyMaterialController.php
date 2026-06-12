<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\StudyMaterialRequest;
use App\Http\Resources\Learning\StudyMaterialResource;
use App\Models\StudyMaterial;
use App\Services\LearningService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudyMaterialController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly LearningService $learningService,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));

        $query = StudyMaterial::query()
            ->with($this->relations())
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $inner) use ($search) {
                    $inner
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('content_url', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('class_id'), fn (Builder $q) => $q->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn (Builder $q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('subject_id'), fn (Builder $q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('material_type'), fn (Builder $q) => $q->where('material_type', $request->query('material_type')))
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->query('status')));

        $this->learningService->applyVisibleScope($query, $request->user());

        $materials = $query
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => StudyMaterialResource::collection($materials->getCollection()),
            'meta' => [
                'current_page' => $materials->currentPage(),
                'from' => $materials->firstItem(),
                'last_page' => $materials->lastPage(),
                'per_page' => $materials->perPage(),
                'to' => $materials->lastItem(),
                'total' => $materials->total(),
            ],
        ]);
    }

    public function store(StudyMaterialRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->learningService->canManageScope(
            $request->user(),
            (int) $validated['class_id'],
            $validated['section_id'] ?? null,
            $validated['subject_id'] ?? null,
        )) {
            return $this->fail('You do not have permission to create material for this class, section, or subject.', 403);
        }

        $payload = $this->learningService->materialPayload($validated, $request->user());
        $material = StudyMaterial::create($payload)->refresh();

        $this->auditLogger->log(
            school: $material->school,
            user: $request->user(),
            action: 'study_material.created',
            changes: $payload,
            auditable: $material,
            ipAddress: $request->ip(),
        );

        return $this->created(
            new StudyMaterialResource($material->load($this->relations())),
            'Study material created.',
        );
    }

    public function show(Request $request, StudyMaterial $studyMaterial): JsonResponse
    {
        if (! $this->learningService->canViewItem($request->user(), $studyMaterial)) {
            return $this->fail('You do not have permission to view this material.', 403);
        }

        return $this->ok(new StudyMaterialResource($studyMaterial->load($this->relations())));
    }

    public function update(StudyMaterialRequest $request, StudyMaterial $studyMaterial): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->learningService->canManageItem($request->user(), $studyMaterial)
            || ! $this->learningService->canManageScope(
                $request->user(),
                (int) $validated['class_id'],
                $validated['section_id'] ?? null,
                $validated['subject_id'] ?? null,
            )) {
            return $this->fail('You do not have permission to update this material.', 403);
        }

        $payload = $this->learningService->materialPayload($validated, $request->user(), $studyMaterial);
        $original = $studyMaterial->only(array_keys($payload));

        $studyMaterial->update($payload);
        $studyMaterial->refresh();

        $changes = $this->auditLogger->diff($original, $studyMaterial->only(array_keys($payload)));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $studyMaterial->school,
                user: $request->user(),
                action: 'study_material.updated',
                changes: $changes,
                auditable: $studyMaterial,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(
            new StudyMaterialResource($studyMaterial->load($this->relations())),
            'Study material updated.',
        );
    }

    public function destroy(Request $request, StudyMaterial $studyMaterial): JsonResponse
    {
        if (! $this->learningService->canManageItem($request->user(), $studyMaterial)) {
            return $this->fail('You do not have permission to archive this material.', 403);
        }

        $original = $studyMaterial->only(['status', 'published_at']);
        $studyMaterial->update(['status' => 'archived', 'published_at' => null]);

        $this->auditLogger->log(
            school: $studyMaterial->school,
            user: $request->user(),
            action: 'study_material.archived',
            changes: $this->auditLogger->diff($original, $studyMaterial->only(['status', 'published_at'])),
            auditable: $studyMaterial,
            ipAddress: $request->ip(),
        );

        return $this->ok(
            new StudyMaterialResource($studyMaterial->load($this->relations())),
            'Study material archived.',
        );
    }

    public function uploadAttachment(Request $request, StudyMaterial $studyMaterial): JsonResponse
    {
        if (! $this->learningService->canManageItem($request->user(), $studyMaterial)) {
            return $this->fail('You do not have permission to upload material files.', 403);
        }

        $request->validate([
            'attachment' => ['required', 'file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,webp,txt,zip', 'max:10240'],
        ]);

        if ($studyMaterial->attachment_path) {
            Storage::disk('public')->delete($studyMaterial->attachment_path);
        }

        $oldPath = $studyMaterial->attachment_path;
        $path = $request->file('attachment')->store("schools/{$studyMaterial->school_id}/study-materials/{$studyMaterial->id}", 'public');
        $studyMaterial->update(['attachment_path' => $path]);

        $this->auditLogger->log(
            school: $studyMaterial->school,
            user: $request->user(),
            action: 'study_material.attachment_uploaded',
            changes: ['attachment_path' => ['old' => $oldPath, 'new' => $path]],
            auditable: $studyMaterial,
            ipAddress: $request->ip(),
        );

        return $this->ok(
            new StudyMaterialResource($studyMaterial->load($this->relations())),
            'Study material file uploaded.',
        );
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['academicSession', 'schoolClass', 'section', 'subject', 'creator'];
    }
}
