<?php

namespace App\Http\Controllers\Api\V1\Exams;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exams\ExamRequest;
use App\Http\Resources\Exams\ExamResource;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Services\ExamAccessService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ExamAccessService $accessService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $query = Exam::query()
            ->with('academicSession')
            ->withCount('schedules')
            ->withCount(['results as published_results_count' => fn (Builder $query) => $query->where('status', 'published')])
            ->when($search !== '', fn (Builder $q) => $q->where('name', 'like', "%{$search}%"))
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('exam_type'), fn (Builder $q) => $q->where('exam_type', $request->query('exam_type')))
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->query('status')));

        if (! $this->accessService->isManager($request->user())) {
            $scheduleQuery = ExamSchedule::query();
            $this->accessService->applyVisibleScheduleScope($scheduleQuery, $request->user());
            $query->whereIn('id', $scheduleQuery->select('exam_id'));
        }

        $exams = $query->orderByDesc('start_date')->orderByDesc('id')->get();

        return $this->ok(ExamResource::collection($exams));
    }

    public function store(ExamRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['status'] = $payload['status'] ?? 'draft';

        $exam = Exam::create($payload)->refresh();

        $this->auditLogger->log(
            school: $exam->school,
            user: $request->user(),
            action: 'exam.created',
            changes: $payload,
            auditable: $exam,
            ipAddress: $request->ip(),
        );

        return $this->created(new ExamResource($exam->load('academicSession')), 'Exam created.');
    }

    public function show(Request $request, Exam $exam): JsonResponse
    {
        if (! $this->accessService->isManager($request->user())) {
            $visible = ExamSchedule::query()->where('exam_id', $exam->id);
            $this->accessService->applyVisibleScheduleScope($visible, $request->user());

            if (! $visible->exists()) {
                return $this->fail('You do not have permission to view this exam.', 403);
            }
        }

        return $this->ok(new ExamResource(
            $exam->load('academicSession')->loadCount([
                'schedules',
                'results as published_results_count' => fn (Builder $query) => $query->where('status', 'published'),
            ]),
        ));
    }

    public function update(ExamRequest $request, Exam $exam): JsonResponse
    {
        $payload = $request->validated();
        $original = $exam->only(array_keys($payload));

        $exam->update($payload);
        $exam->refresh();

        $changes = $this->auditLogger->diff($original, $exam->only(array_keys($payload)));
        if ($changes !== []) {
            $this->auditLogger->log(
                school: $exam->school,
                user: $request->user(),
                action: 'exam.updated',
                changes: $changes,
                auditable: $exam,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new ExamResource($exam->load('academicSession')), 'Exam updated.');
    }

    public function destroy(Request $request, Exam $exam): JsonResponse
    {
        if (! $this->accessService->isManager($request->user())) {
            return $this->fail('You do not have permission to archive exams.', 403);
        }

        $original = $exam->only(['status']);
        $exam->update(['status' => 'archived']);

        $this->auditLogger->log(
            school: $exam->school,
            user: $request->user(),
            action: 'exam.archived',
            changes: $this->auditLogger->diff($original, $exam->only(['status'])),
            auditable: $exam,
            ipAddress: $request->ip(),
        );

        return $this->ok(new ExamResource($exam->load('academicSession')), 'Exam archived.');
    }
}
