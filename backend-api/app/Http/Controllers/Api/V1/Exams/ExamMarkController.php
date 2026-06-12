<?php

namespace App\Http\Controllers\Api\V1\Exams;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exams\ExamMarksRequest;
use App\Http\Resources\Exams\ExamScheduleResource;
use App\Models\ExamMark;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\Student;
use App\Services\ExamAccessService;
use App\Services\ExamResultService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamMarkController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ExamAccessService $accessService,
        private readonly ExamResultService $resultService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function roster(Request $request, ExamSchedule $examSchedule): JsonResponse
    {
        if (! $this->accessService->canAccessSchedule($request->user(), $examSchedule)) {
            return $this->fail('You do not have permission to access this marks roster.', 403);
        }

        $examSchedule->load(['exam', 'schoolClass', 'section', 'subject']);

        $marks = ExamMark::query()
            ->where('exam_schedule_id', $examSchedule->id)
            ->get()
            ->keyBy('student_id');

        $students = Student::query()
            ->where('academic_session_id', $examSchedule->exam->academic_session_id)
            ->where('class_id', $examSchedule->class_id)
            ->when($examSchedule->section_id !== null, fn (Builder $q) => $q->where('section_id', $examSchedule->section_id))
            ->where('status', 'active')
            ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
            ->orderBy('first_name')
            ->get();

        $items = $students->map(function (Student $student) use ($marks) {
            $mark = $marks->get($student->id);

            return [
                'student_id' => $student->id,
                'admission_no' => $student->admission_no,
                'full_name' => $student->full_name,
                'roll_no' => $student->roll_no,
                'marks_obtained' => $mark?->marks_obtained !== null ? (float) $mark->marks_obtained : null,
                'attendance_status' => $mark?->attendance_status ?? 'present',
                'remarks' => $mark?->remarks,
                'status' => $mark?->status ?? 'draft',
            ];
        })->values();

        $locked = ExamResult::query()
            ->where('exam_id', $examSchedule->exam_id)
            ->where('class_id', $examSchedule->class_id)
            ->when($examSchedule->section_id !== null, fn (Builder $q) => $q->where('section_id', $examSchedule->section_id))
            ->where('status', 'published')
            ->exists();

        return $this->ok([
            'schedule' => new ExamScheduleResource($examSchedule),
            'is_locked' => $locked,
            'students' => $items,
        ]);
    }

    public function update(ExamMarksRequest $request, ExamSchedule $examSchedule): JsonResponse
    {
        if (! $this->accessService->canAccessSchedule($request->user(), $examSchedule)) {
            return $this->fail('You do not have permission to enter marks for this schedule.', 403);
        }

        $this->resultService->saveMarks($examSchedule, $request->validated(), $request->user());

        $this->auditLogger->log(
            school: $examSchedule->exam->school,
            user: $request->user(),
            action: 'exam_marks.saved',
            changes: [
                'schedule_id' => $examSchedule->id,
                'record_count' => count($request->validated('records')),
                'status' => $request->validated('status') ?? 'submitted',
            ],
            auditable: $examSchedule,
            ipAddress: $request->ip(),
        );

        return $this->roster($request, $examSchedule);
    }
}
