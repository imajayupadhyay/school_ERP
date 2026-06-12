<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\HomeworkAssignmentRequest;
use App\Http\Resources\Learning\HomeworkAssignmentResource;
use App\Models\HomeworkAssignment;
use App\Services\LearningService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class HomeworkAssignmentController extends Controller
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

        $query = HomeworkAssignment::query()
            ->with($this->relations())
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $inner) use ($search) {
                    $inner
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('instructions', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('class_id'), fn (Builder $q) => $q->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn (Builder $q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('subject_id'), fn (Builder $q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->query('status')))
            ->when($request->filled('due_from'), fn (Builder $q) => $q->whereDate('due_date', '>=', $request->query('due_from')))
            ->when($request->filled('due_to'), fn (Builder $q) => $q->whereDate('due_date', '<=', $request->query('due_to')));

        $this->learningService->applyVisibleScope($query, $request->user());

        $homework = $query
            ->orderByDesc('assigned_date')
            ->orderByRaw('due_date IS NULL, due_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => HomeworkAssignmentResource::collection($homework->getCollection()),
            'meta' => [
                'current_page' => $homework->currentPage(),
                'from' => $homework->firstItem(),
                'last_page' => $homework->lastPage(),
                'per_page' => $homework->perPage(),
                'to' => $homework->lastItem(),
                'total' => $homework->total(),
            ],
        ]);
    }

    public function store(HomeworkAssignmentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->learningService->canManageScope(
            $request->user(),
            (int) $validated['class_id'],
            $validated['section_id'] ?? null,
            $validated['subject_id'] ?? null,
        )) {
            return $this->fail('You do not have permission to create homework for this class, section, or subject.', 403);
        }

        $payload = $this->learningService->homeworkPayload($validated, $request->user());
        $homework = HomeworkAssignment::create($payload)->refresh();

        $this->auditLogger->log(
            school: $homework->school,
            user: $request->user(),
            action: 'homework.created',
            changes: $payload,
            auditable: $homework,
            ipAddress: $request->ip(),
        );

        return $this->created(
            new HomeworkAssignmentResource($homework->load($this->relations())),
            'Homework created.',
        );
    }

    public function show(Request $request, HomeworkAssignment $homeworkAssignment): JsonResponse
    {
        if (! $this->learningService->canViewItem($request->user(), $homeworkAssignment)) {
            return $this->fail('You do not have permission to view this homework.', 403);
        }

        return $this->ok(new HomeworkAssignmentResource($homeworkAssignment->load($this->relations())));
    }

    public function update(HomeworkAssignmentRequest $request, HomeworkAssignment $homeworkAssignment): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->learningService->canManageItem($request->user(), $homeworkAssignment)
            || ! $this->learningService->canManageScope(
                $request->user(),
                (int) $validated['class_id'],
                $validated['section_id'] ?? null,
                $validated['subject_id'] ?? null,
            )) {
            return $this->fail('You do not have permission to update this homework.', 403);
        }

        $payload = $this->learningService->homeworkPayload($validated, $request->user(), $homeworkAssignment);
        $original = $homeworkAssignment->only(array_keys($payload));

        $homeworkAssignment->update($payload);
        $homeworkAssignment->refresh();

        $changes = $this->auditLogger->diff($original, $homeworkAssignment->only(array_keys($payload)));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $homeworkAssignment->school,
                user: $request->user(),
                action: 'homework.updated',
                changes: $changes,
                auditable: $homeworkAssignment,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(
            new HomeworkAssignmentResource($homeworkAssignment->load($this->relations())),
            'Homework updated.',
        );
    }

    public function destroy(Request $request, HomeworkAssignment $homeworkAssignment): JsonResponse
    {
        if (! $this->learningService->canManageItem($request->user(), $homeworkAssignment)) {
            return $this->fail('You do not have permission to archive this homework.', 403);
        }

        $original = $homeworkAssignment->only(['status', 'published_at']);
        $homeworkAssignment->update(['status' => 'archived', 'published_at' => null]);

        $this->auditLogger->log(
            school: $homeworkAssignment->school,
            user: $request->user(),
            action: 'homework.archived',
            changes: $this->auditLogger->diff($original, $homeworkAssignment->only(['status', 'published_at'])),
            auditable: $homeworkAssignment,
            ipAddress: $request->ip(),
        );

        return $this->ok(
            new HomeworkAssignmentResource($homeworkAssignment->load($this->relations())),
            'Homework archived.',
        );
    }

    public function uploadAttachment(Request $request, HomeworkAssignment $homeworkAssignment): JsonResponse
    {
        if (! $this->learningService->canManageItem($request->user(), $homeworkAssignment)) {
            return $this->fail('You do not have permission to upload homework attachments.', 403);
        }

        $request->validate([
            'attachment' => ['required', 'file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,webp,txt', 'max:5120'],
        ]);

        if ($homeworkAssignment->attachment_path) {
            Storage::disk('public')->delete($homeworkAssignment->attachment_path);
        }

        $oldPath = $homeworkAssignment->attachment_path;
        $path = $request->file('attachment')->store("schools/{$homeworkAssignment->school_id}/homework/{$homeworkAssignment->id}", 'public');
        $homeworkAssignment->update(['attachment_path' => $path]);

        $this->auditLogger->log(
            school: $homeworkAssignment->school,
            user: $request->user(),
            action: 'homework.attachment_uploaded',
            changes: ['attachment_path' => ['old' => $oldPath, 'new' => $path]],
            auditable: $homeworkAssignment,
            ipAddress: $request->ip(),
        );

        return $this->ok(
            new HomeworkAssignmentResource($homeworkAssignment->load($this->relations())),
            'Homework attachment uploaded.',
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
