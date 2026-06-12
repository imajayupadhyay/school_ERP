<?php

namespace App\Http\Controllers\Api\V1\Exams;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exams\ExamResultScopeRequest;
use App\Http\Resources\Exams\ExamResultResource;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Student;
use App\Services\ExamAccessService;
use App\Services\ExamResultService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamResultController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ExamAccessService $accessService,
        private readonly ExamResultService $resultService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request, Exam $exam): JsonResponse
    {
        if (! $this->accessService->isManager($request->user())) {
            return $this->fail('You do not have permission to view result administration.', 403);
        }

        $results = ExamResult::query()
            ->with(['student', 'schoolClass', 'section', 'publisher'])
            ->where('exam_id', $exam->id)
            ->when($request->filled('class_id'), fn (Builder $q) => $q->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn (Builder $q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->query('status')))
            ->orderBy('class_id')
            ->orderBy('section_id')
            ->orderByDesc('percentage')
            ->get();

        return $this->ok(ExamResultResource::collection($results));
    }

    public function show(Request $request, Exam $exam, Student $student): JsonResponse
    {
        if (! $this->accessService->isManager($request->user())) {
            return $this->fail('You do not have permission to view this report card.', 403);
        }

        $result = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->with(['exam', 'student', 'schoolClass', 'section', 'publisher', 'items'])
            ->firstOrFail();

        return $this->ok(new ExamResultResource($result));
    }

    public function publish(ExamResultScopeRequest $request, Exam $exam): JsonResponse
    {
        $validated = $request->validated();
        $result = $this->resultService->publish(
            $exam,
            (int) $validated['class_id'],
            $validated['section_id'] ?? null,
            $request->user(),
        );

        $this->auditLogger->log(
            school: $exam->school,
            user: $request->user(),
            action: 'exam_results.published',
            changes: [
                ...$validated,
                'published_count' => $result['count'],
                'result_ids' => $result['result_ids'],
            ],
            auditable: $exam,
            ipAddress: $request->ip(),
        );

        return $this->ok($result, "{$result['count']} results published.");
    }

    public function unpublish(ExamResultScopeRequest $request, Exam $exam): JsonResponse
    {
        $validated = $request->validated();
        $count = $this->resultService->unpublish(
            $exam,
            (int) $validated['class_id'],
            $validated['section_id'] ?? null,
        );

        $this->auditLogger->log(
            school: $exam->school,
            user: $request->user(),
            action: 'exam_results.unpublished',
            changes: [...$validated, 'unpublished_count' => $count],
            auditable: $exam,
            ipAddress: $request->ip(),
        );

        return $this->ok(['count' => $count], "{$count} results unpublished.");
    }
}
