<?php

namespace App\Http\Controllers\Api\V1\Attendance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\AttendanceRosterRequest;
use App\Http\Requests\Attendance\AttendanceSummaryRequest;
use App\Http\Requests\Attendance\MarkAttendanceRequest;
use App\Http\Resources\Attendance\AttendanceSessionResource;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\AttendanceService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AttendanceController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AttendanceService $attendanceService,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);

        $query = AttendanceSession::query()
            ->with(['academicSession', 'schoolClass', 'section', 'markedBy'])
            ->withCount($this->recordCounts())
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('class_id'), fn (Builder $q) => $q->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn (Builder $q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->query('status')))
            ->when($request->filled('date'), fn (Builder $q) => $q->whereDate('attendance_date', $request->query('date')))
            ->when($request->filled('from'), fn (Builder $q) => $q->whereDate('attendance_date', '>=', $request->query('from')))
            ->when($request->filled('to'), fn (Builder $q) => $q->whereDate('attendance_date', '<=', $request->query('to')));

        $this->attendanceService->applyVisibleSessionScope($query, $request->user());

        $sessions = $query
            ->orderByDesc('attendance_date')
            ->orderBy('class_id')
            ->orderBy('section_id')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => AttendanceSessionResource::collection($sessions->getCollection()),
            'meta' => [
                'current_page' => $sessions->currentPage(),
                'from' => $sessions->firstItem(),
                'last_page' => $sessions->lastPage(),
                'per_page' => $sessions->perPage(),
                'to' => $sessions->lastItem(),
                'total' => $sessions->total(),
            ],
        ]);
    }

    public function roster(AttendanceRosterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->attendanceService->canAccessRoster(
            $request->user(),
            (int) $validated['class_id'],
            $validated['section_id'] ?? null,
        )) {
            return $this->fail('You do not have permission to access this attendance roster.', 403);
        }

        $session = AttendanceSession::query()
            ->with(['records.student', 'academicSession', 'schoolClass', 'section', 'markedBy'])
            ->withCount($this->recordCounts())
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('class_id', $validated['class_id'])
            ->where('section_id', $validated['section_id'] ?? null)
            ->whereDate('attendance_date', $validated['attendance_date'])
            ->first();

        $recordsByStudent = $session?->records->keyBy('student_id') ?? collect();

        $students = Student::query()
            ->where('status', 'active')
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('class_id', $validated['class_id'])
            ->when(
                ! empty($validated['section_id']),
                fn (Builder $q) => $q->where('section_id', $validated['section_id']),
            )
            ->with(['schoolClass', 'schoolSection'])
            ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
            ->orderBy('first_name')
            ->get();

        $items = $students->map(function (Student $student) use ($recordsByStudent) {
            $record = $recordsByStudent->get($student->id);

            return [
                'student_id' => $student->id,
                'admission_no' => $student->admission_no,
                'full_name' => $student->full_name,
                'roll_no' => $student->roll_no,
                'class_name' => $student->class_name,
                'section' => $student->section,
                'status' => $record?->status ?? 'present',
                'remarks' => $record?->remarks,
            ];
        })->values();

        return $this->ok([
            'session' => $session ? new AttendanceSessionResource($session) : null,
            'is_marked' => $session !== null,
            'students' => $items,
            'summary' => $this->summarizeRoster($items),
        ]);
    }

    public function store(MarkAttendanceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->attendanceService->canAccessRoster(
            $request->user(),
            (int) $validated['class_id'],
            $validated['section_id'] ?? null,
        )) {
            return $this->fail('You do not have permission to mark this attendance roster.', 403);
        }

        $wasExisting = AttendanceSession::query()
            ->where('academic_session_id', $validated['academic_session_id'])
            ->where('class_id', $validated['class_id'])
            ->where('section_id', $validated['section_id'] ?? null)
            ->whereDate('attendance_date', $validated['attendance_date'])
            ->exists();

        $session = $this->attendanceService->mark($validated, $request->user())
            ->load(['records.student', 'academicSession', 'schoolClass', 'section', 'markedBy'])
            ->loadCount($this->recordCounts());

        $summary = $this->summarizeRecords($session->records);

        $this->auditLogger->log(
            school: $session->school,
            user: $request->user(),
            action: $wasExisting ? 'attendance.updated' : 'attendance.marked',
            changes: [
                'academic_session_id' => $session->academic_session_id,
                'class_id' => $session->class_id,
                'section_id' => $session->section_id,
                'attendance_date' => $session->attendance_date?->toDateString(),
                'status' => $session->status,
                'summary' => $summary,
            ],
            auditable: $session,
            ipAddress: $request->ip(),
        );

        $message = $wasExisting ? 'Attendance updated.' : 'Attendance marked.';

        return $wasExisting
            ? $this->ok(new AttendanceSessionResource($session), $message)
            : $this->created(new AttendanceSessionResource($session), $message);
    }

    public function show(Request $request, AttendanceSession $attendanceSession): JsonResponse
    {
        if (! $this->attendanceService->canAccessRoster(
            $request->user(),
            (int) $attendanceSession->class_id,
            $attendanceSession->section_id,
        )) {
            return $this->fail('You do not have permission to view this attendance session.', 403);
        }

        return $this->ok(new AttendanceSessionResource(
            $attendanceSession
                ->load(['records.student', 'academicSession', 'schoolClass', 'section', 'markedBy'])
                ->loadCount($this->recordCounts()),
        ));
    }

    public function summary(AttendanceSummaryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! empty($validated['class_id']) && ! $this->attendanceService->canAccessRoster(
            $request->user(),
            (int) $validated['class_id'],
            $validated['section_id'] ?? null,
        )) {
            return $this->fail('You do not have permission to view this attendance report.', 403);
        }

        $sessionScope = AttendanceSession::query()
            ->whereDate('attendance_date', '>=', $validated['from'])
            ->whereDate('attendance_date', '<=', $validated['to'])
            ->when(! empty($validated['academic_session_id']), fn (Builder $q) => $q->where('academic_session_id', $validated['academic_session_id']))
            ->when(! empty($validated['class_id']), fn (Builder $q) => $q->where('class_id', $validated['class_id']))
            ->when(! empty($validated['section_id']), fn (Builder $q) => $q->where('section_id', $validated['section_id']));

        $this->attendanceService->applyVisibleSessionScope($sessionScope, $request->user());

        $visibleSessionIds = $sessionScope->pluck('id');

        $records = AttendanceRecord::query()
            ->with(['student.schoolClass', 'student.schoolSection'])
            ->whereIn('attendance_session_id', $visibleSessionIds)
            ->when(! empty($validated['student_id']), fn (Builder $q) => $q->where('student_id', $validated['student_id']))
            ->get();

        $items = $records
            ->groupBy('student_id')
            ->map(function (Collection $studentRecords) {
                /** @var AttendanceRecord|null $first */
                $first = $studentRecords->first();
                $student = $first?->student;
                $summary = $this->summarizeRecords($studentRecords);
                $attended = $summary['present'] + $summary['late'] + $summary['half_day'] + $summary['excused'];

                return [
                    'student_id' => $student?->id,
                    'admission_no' => $student?->admission_no,
                    'full_name' => $student?->full_name,
                    'roll_no' => $student?->roll_no,
                    'class_name' => $student?->class_name,
                    'section' => $student?->section,
                    ...$summary,
                    'attendance_percentage' => $summary['total'] > 0
                        ? round(($attended / $summary['total']) * 100, 2)
                        : 0.0,
                ];
            })
            ->sortBy([
                ['class_name', 'asc'],
                ['section', 'asc'],
                ['roll_no', 'asc'],
                ['full_name', 'asc'],
            ])
            ->values();

        return $this->ok([
            'range' => [
                'from' => $validated['from'],
                'to' => $validated['to'],
            ],
            'sessions_count' => $visibleSessionIds->count(),
            'summary' => $this->summarizeRecords($records),
            'items' => $items,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function recordCounts(): array
    {
        return [
            'records',
            'records as present_count' => fn (Builder $query) => $query->where('status', 'present'),
            'records as absent_count' => fn (Builder $query) => $query->where('status', 'absent'),
            'records as late_count' => fn (Builder $query) => $query->where('status', 'late'),
            'records as half_day_count' => fn (Builder $query) => $query->where('status', 'half_day'),
            'records as excused_count' => fn (Builder $query) => $query->where('status', 'excused'),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return array<string, int>
     */
    private function summarizeRoster(Collection $items): array
    {
        return [
            'total' => $items->count(),
            'present' => $items->where('status', 'present')->count(),
            'absent' => $items->where('status', 'absent')->count(),
            'late' => $items->where('status', 'late')->count(),
            'half_day' => $items->where('status', 'half_day')->count(),
            'excused' => $items->where('status', 'excused')->count(),
        ];
    }

    /**
     * @param  Collection<int, AttendanceRecord>  $records
     * @return array<string, int>
     */
    private function summarizeRecords(Collection $records): array
    {
        return [
            'total' => $records->count(),
            'present' => $records->where('status', 'present')->count(),
            'absent' => $records->where('status', 'absent')->count(),
            'late' => $records->where('status', 'late')->count(),
            'half_day' => $records->where('status', 'half_day')->count(),
            'excused' => $records->where('status', 'excused')->count(),
        ];
    }
}
