<?php

namespace App\Http\Controllers\Api\V1\Exams;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exams\ExamScheduleRequest;
use App\Http\Resources\Exams\ExamScheduleResource;
use App\Models\ExamResultItem;
use App\Models\ExamSchedule;
use App\Services\ExamAccessService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamScheduleController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ExamAccessService $accessService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = ExamSchedule::query()
            ->with($this->relations())
            ->withCount('marks')
            ->withCount(['marks as submitted_marks_count' => fn (Builder $q) => $q->where('status', 'submitted')])
            ->when($request->filled('exam_id'), fn (Builder $q) => $q->where('exam_id', $request->integer('exam_id')))
            ->when($request->filled('class_id'), fn (Builder $q) => $q->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn (Builder $q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('subject_id'), fn (Builder $q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->query('status')));

        $this->accessService->applyVisibleScheduleScope($query, $request->user());

        return $this->ok(ExamScheduleResource::collection(
            $query->orderBy('exam_date')->orderBy('start_time')->orderBy('class_id')->get(),
        ));
    }

    public function store(ExamScheduleRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['status'] = $payload['status'] ?? 'scheduled';
        $schedule = ExamSchedule::create($payload)->refresh();

        $this->auditLogger->log(
            school: $schedule->exam->school,
            user: $request->user(),
            action: 'exam_schedule.created',
            changes: $payload,
            auditable: $schedule,
            ipAddress: $request->ip(),
        );

        return $this->created(new ExamScheduleResource($schedule->load($this->relations())), 'Exam schedule created.');
    }

    public function show(Request $request, ExamSchedule $examSchedule): JsonResponse
    {
        if (! $this->accessService->canAccessSchedule($request->user(), $examSchedule)) {
            return $this->fail('You do not have permission to view this schedule.', 403);
        }

        return $this->ok(new ExamScheduleResource(
            $examSchedule->load($this->relations())->loadCount([
                'marks',
                'marks as submitted_marks_count' => fn (Builder $q) => $q->where('status', 'submitted'),
            ]),
        ));
    }

    public function update(ExamScheduleRequest $request, ExamSchedule $examSchedule): JsonResponse
    {
        if (ExamResultItem::query()->where('exam_schedule_id', $examSchedule->id)->exists()) {
            return $this->fail('Unpublish affected results before editing this schedule.', 422);
        }

        $payload = $request->validated();
        $original = $examSchedule->only(array_keys($payload));

        $examSchedule->update($payload);
        $examSchedule->refresh();

        $changes = $this->auditLogger->diff($original, $examSchedule->only(array_keys($payload)));
        if ($changes !== []) {
            $this->auditLogger->log(
                school: $examSchedule->exam->school,
                user: $request->user(),
                action: 'exam_schedule.updated',
                changes: $changes,
                auditable: $examSchedule,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new ExamScheduleResource($examSchedule->load($this->relations())), 'Exam schedule updated.');
    }

    public function destroy(Request $request, ExamSchedule $examSchedule): JsonResponse
    {
        if (! $this->accessService->isManager($request->user())) {
            return $this->fail('You do not have permission to delete schedules.', 403);
        }

        if ($examSchedule->marks()->exists() || ExamResultItem::query()->where('exam_schedule_id', $examSchedule->id)->exists()) {
            return $this->fail('A schedule with marks or result snapshots cannot be deleted.', 422);
        }

        $school = $examSchedule->exam->school;
        $scheduleId = $examSchedule->id;
        $examSchedule->delete();

        $this->auditLogger->log(
            school: $school,
            user: $request->user(),
            action: 'exam_schedule.deleted',
            changes: ['schedule_id' => $scheduleId],
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Exam schedule deleted.');
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['exam', 'schoolClass', 'section', 'subject'];
    }
}
