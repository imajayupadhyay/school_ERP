<?php

namespace App\Services\Reports;

use App\Models\AuditLog;
use App\Models\School;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchoolReportService
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function overview(School $school, array $filters): array
    {
        $schoolId = $school->id;
        $from = (string) $filters['from'];
        $to = (string) $filters['to'];

        $studentQuery = $this->studentQuery($schoolId, $filters);
        $feeSummary = $this->feeSummary($schoolId, $filters);
        $attendanceSummary = $this->attendanceSummary($schoolId, $filters);
        $examSummary = $this->examSummary($schoolId, $filters);
        $learningSummary = $this->learningSummary($schoolId, $filters);
        $auditSummary = $this->auditSummary($schoolId, $from, $to);

        return [
            'range' => ['from' => $from, 'to' => $to],
            'filters' => [
                'academic_session_id' => $filters['academic_session_id'] ?? null,
                'class_id' => $filters['class_id'] ?? null,
                'section_id' => $filters['section_id'] ?? null,
            ],
            'students' => [
                'total' => (clone $studentQuery)->count(),
                'active' => (clone $studentQuery)->where('status', 'active')->count(),
                'new_admissions' => (clone $studentQuery)
                    ->whereDate('admission_date', '>=', $from)
                    ->whereDate('admission_date', '<=', $to)
                    ->count(),
                'archived' => (clone $studentQuery)->where('status', 'archived')->count(),
            ],
            'employees' => $this->employeeSummary($schoolId, $from, $to),
            'fees' => $feeSummary,
            'attendance' => $attendanceSummary,
            'exams' => $examSummary,
            'learning' => $learningSummary,
            'audit' => $auditSummary,
            'fee_by_class' => $this->feeByClass($schoolId, $filters),
            'attendance_by_class' => $this->attendanceByClass($schoolId, $filters),
            'exam_by_class' => $this->examByClass($schoolId, $filters),
            'activity_trend' => $this->activityTrend($schoolId, $from, $to),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function studentQuery(int $schoolId, array $filters): Builder
    {
        return DB::table('students')
            ->where('school_id', $schoolId)
            ->when(! empty($filters['academic_session_id']), fn (Builder $q) => $q->where('academic_session_id', $filters['academic_session_id']))
            ->when(! empty($filters['class_id']), fn (Builder $q) => $q->where('class_id', $filters['class_id']))
            ->when(! empty($filters['section_id']), fn (Builder $q) => $q->where('section_id', $filters['section_id']));
    }

    /**
     * @return array<string, int>
     */
    private function employeeSummary(int $schoolId, string $from, string $to): array
    {
        $base = DB::table('employees')->where('school_id', $schoolId)->whereNull('deleted_at');

        return [
            'total' => (clone $base)->count(),
            'active' => (clone $base)->whereIn('status', ['active', 'on_leave'])->count(),
            'teaching' => (clone $base)->where('employee_type', 'teaching')->whereIn('status', ['active', 'on_leave'])->count(),
            'new_joiners' => (clone $base)
                ->whereDate('joining_date', '>=', $from)
                ->whereDate('joining_date', '<=', $to)
                ->count(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, float|int>
     */
    private function feeSummary(int $schoolId, array $filters): array
    {
        $from = (string) $filters['from'];
        $to = (string) $filters['to'];
        $invoiceBase = $this->invoiceQuery($schoolId, $filters)
            ->whereDate('i.due_date', '>=', $from)
            ->whereDate('i.due_date', '<=', $to);

        $billed = (float) (clone $invoiceBase)->sum('i.total_amount');
        $paidOnInvoices = (float) (clone $invoiceBase)->sum('i.paid_amount');
        $outstanding = (float) (clone $invoiceBase)->sum(DB::raw('i.total_amount - i.paid_amount'));
        $today = CarbonImmutable::today()->toDateString();
        $overdue = (float) (clone $invoiceBase)
            ->whereRaw('i.total_amount - i.paid_amount > 0')
            ->whereDate('i.due_date', '<', $today)
            ->sum(DB::raw('i.total_amount - i.paid_amount'));

        $collected = (float) $this->paymentQuery($schoolId, $filters)
            ->whereDate('p.paid_on', '>=', $from)
            ->whereDate('p.paid_on', '<=', $to)
            ->sum('p.amount');

        return [
            'billed' => round($billed, 2),
            'collected' => round($collected, 2),
            'paid_on_invoices' => round($paidOnInvoices, 2),
            'outstanding' => round($outstanding, 2),
            'overdue' => round($overdue, 2),
            'collection_rate' => $billed > 0 ? (int) round(($collected / $billed) * 100) : 0,
            'invoices' => (clone $invoiceBase)->count(),
            'payments' => $this->paymentQuery($schoolId, $filters)
                ->whereDate('p.paid_on', '>=', $from)
                ->whereDate('p.paid_on', '<=', $to)
                ->count(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function invoiceQuery(int $schoolId, array $filters): Builder
    {
        $query = DB::table('fee_invoices as i')
            ->join('students as s', 's.id', '=', 'i.student_id')
            ->where('i.school_id', $schoolId)
            ->where('i.status', '!=', 'cancelled');

        $this->applyStudentFilters($query, $filters, 's');

        return $query;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function paymentQuery(int $schoolId, array $filters): Builder
    {
        $query = DB::table('fee_payments as p')
            ->join('students as s', 's.id', '=', 'p.student_id')
            ->where('p.school_id', $schoolId)
            ->where('p.status', 'completed');

        $this->applyStudentFilters($query, $filters, 's');

        return $query;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyStudentFilters(Builder $query, array $filters, string $alias): void
    {
        $query
            ->when(! empty($filters['academic_session_id']), fn (Builder $q) => $q->where("{$alias}.academic_session_id", $filters['academic_session_id']))
            ->when(! empty($filters['class_id']), fn (Builder $q) => $q->where("{$alias}.class_id", $filters['class_id']))
            ->when(! empty($filters['section_id']), fn (Builder $q) => $q->where("{$alias}.section_id", $filters['section_id']));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, float|int>
     */
    private function attendanceSummary(int $schoolId, array $filters): array
    {
        $rows = $this->attendanceQuery($schoolId, $filters)
            ->select('r.status', DB::raw('count(*) as c'))
            ->groupBy('r.status')
            ->pluck('c', 'status');

        $summary = [
            'sessions' => $this->attendanceSessionQuery($schoolId, $filters)->distinct()->count('sessions.id'),
            'records' => (int) $rows->sum(),
            'present' => (int) ($rows['present'] ?? 0),
            'absent' => (int) ($rows['absent'] ?? 0),
            'late' => (int) ($rows['late'] ?? 0),
            'half_day' => (int) ($rows['half_day'] ?? 0),
            'excused' => (int) ($rows['excused'] ?? 0),
        ];
        $attended = $summary['present'] + $summary['late'] + $summary['half_day'] + $summary['excused'];

        return [
            ...$summary,
            'attendance_rate' => $summary['records'] > 0 ? (int) round(($attended / $summary['records']) * 100) : 0,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function attendanceSessionQuery(int $schoolId, array $filters): Builder
    {
        return DB::table('attendance_sessions as sessions')
            ->where('sessions.school_id', $schoolId)
            ->whereDate('sessions.attendance_date', '>=', $filters['from'])
            ->whereDate('sessions.attendance_date', '<=', $filters['to'])
            ->when(! empty($filters['academic_session_id']), fn (Builder $q) => $q->where('sessions.academic_session_id', $filters['academic_session_id']))
            ->when(! empty($filters['class_id']), fn (Builder $q) => $q->where('sessions.class_id', $filters['class_id']))
            ->when(! empty($filters['section_id']), fn (Builder $q) => $q->where('sessions.section_id', $filters['section_id']));
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function attendanceQuery(int $schoolId, array $filters): Builder
    {
        return DB::table('attendance_records as r')
            ->join('attendance_sessions as sessions', 'sessions.id', '=', 'r.attendance_session_id')
            ->where('r.school_id', $schoolId)
            ->whereDate('sessions.attendance_date', '>=', $filters['from'])
            ->whereDate('sessions.attendance_date', '<=', $filters['to'])
            ->when(! empty($filters['academic_session_id']), fn (Builder $q) => $q->where('sessions.academic_session_id', $filters['academic_session_id']))
            ->when(! empty($filters['class_id']), fn (Builder $q) => $q->where('sessions.class_id', $filters['class_id']))
            ->when(! empty($filters['section_id']), fn (Builder $q) => $q->where('sessions.section_id', $filters['section_id']));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, float|int>
     */
    private function examSummary(int $schoolId, array $filters): array
    {
        $base = $this->examResultQuery($schoolId, $filters);
        $total = (clone $base)->count();
        $pass = (clone $base)->where('r.result_status', 'pass')->count();
        $fail = (clone $base)->where('r.result_status', 'fail')->count();
        $average = (float) (clone $base)->avg('r.percentage');

        return [
            'published_results' => $total,
            'passed' => $pass,
            'failed' => $fail,
            'average_percentage' => round($average, 2),
            'pass_rate' => $total > 0 ? (int) round(($pass / $total) * 100) : 0,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function examResultQuery(int $schoolId, array $filters): Builder
    {
        return DB::table('exam_results as r')
            ->join('exams as e', 'e.id', '=', 'r.exam_id')
            ->where('r.school_id', $schoolId)
            ->where('r.status', 'published')
            ->whereDate('r.published_at', '>=', $filters['from'])
            ->whereDate('r.published_at', '<=', $filters['to'])
            ->when(! empty($filters['academic_session_id']), fn (Builder $q) => $q->where('e.academic_session_id', $filters['academic_session_id']))
            ->when(! empty($filters['class_id']), fn (Builder $q) => $q->where('r.class_id', $filters['class_id']))
            ->when(! empty($filters['section_id']), fn (Builder $q) => $q->where('r.section_id', $filters['section_id']));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, int>
     */
    private function learningSummary(int $schoolId, array $filters): array
    {
        $homework = DB::table('homework_assignments')
            ->where('school_id', $schoolId)
            ->whereDate('assigned_date', '>=', $filters['from'])
            ->whereDate('assigned_date', '<=', $filters['to'])
            ->when(! empty($filters['academic_session_id']), fn (Builder $q) => $q->where('academic_session_id', $filters['academic_session_id']))
            ->when(! empty($filters['class_id']), fn (Builder $q) => $q->where('class_id', $filters['class_id']))
            ->when(! empty($filters['section_id']), fn (Builder $q) => $q->where('section_id', $filters['section_id']));

        $materials = DB::table('study_materials')
            ->where('school_id', $schoolId)
            ->whereDate('created_at', '>=', $filters['from'])
            ->whereDate('created_at', '<=', $filters['to'])
            ->when(! empty($filters['academic_session_id']), fn (Builder $q) => $q->where('academic_session_id', $filters['academic_session_id']))
            ->when(! empty($filters['class_id']), fn (Builder $q) => $q->where('class_id', $filters['class_id']))
            ->when(! empty($filters['section_id']), fn (Builder $q) => $q->where('section_id', $filters['section_id']));

        $notices = DB::table('notices')
            ->where('school_id', $schoolId)
            ->whereDate('created_at', '>=', $filters['from'])
            ->whereDate('created_at', '<=', $filters['to']);

        return [
            'homework' => (clone $homework)->count(),
            'homework_published' => (clone $homework)->where('status', 'published')->count(),
            'study_materials' => (clone $materials)->count(),
            'materials_published' => (clone $materials)->where('status', 'published')->count(),
            'notices' => (clone $notices)->count(),
            'notices_published' => (clone $notices)->where('status', 'published')->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function auditSummary(int $schoolId, string $from, string $to): array
    {
        $base = AuditLog::forSchool($schoolId)
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to);

        return [
            'events' => (clone $base)->count(),
            'actors' => (clone $base)->whereNotNull('user_id')->distinct()->count('user_id'),
            'modules' => (clone $base)
                ->get(['action'])
                ->groupBy(fn (AuditLog $log) => Str::before($log->action, '.'))
                ->map->count()
                ->sortDesc()
                ->map(fn (int $count, string $module) => ['module' => $module, 'count' => $count])
                ->values(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    private function feeByClass(int $schoolId, array $filters): array
    {
        return $this->invoiceQuery($schoolId, $filters)
            ->leftJoin('classes as c', 'c.id', '=', 's.class_id')
            ->whereDate('i.due_date', '>=', $filters['from'])
            ->whereDate('i.due_date', '<=', $filters['to'])
            ->selectRaw('s.class_id, COALESCE(c.name, s.class_name, "Unassigned") as class_name')
            ->selectRaw('count(distinct i.student_id) as students')
            ->selectRaw('sum(i.total_amount) as billed')
            ->selectRaw('sum(i.paid_amount) as collected')
            ->selectRaw('sum(i.total_amount - i.paid_amount) as outstanding')
            ->groupBy('s.class_id', 'c.name', 's.class_name')
            ->orderBy('class_name')
            ->get()
            ->map(fn ($row) => [
                'class_id' => $row->class_id,
                'class_name' => $row->class_name,
                'students' => (int) $row->students,
                'billed' => round((float) $row->billed, 2),
                'collected' => round((float) $row->collected, 2),
                'outstanding' => round((float) $row->outstanding, 2),
                'collection_rate' => (float) $row->billed > 0 ? (int) round(((float) $row->collected / (float) $row->billed) * 100) : 0,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    private function attendanceByClass(int $schoolId, array $filters): array
    {
        return $this->attendanceQuery($schoolId, $filters)
            ->leftJoin('classes as c', 'c.id', '=', 'sessions.class_id')
            ->selectRaw('sessions.class_id, COALESCE(c.name, "Unassigned") as class_name')
            ->selectRaw('count(distinct sessions.id) as sessions')
            ->selectRaw('count(r.id) as records')
            ->selectRaw("sum(case when r.status = 'present' then 1 else 0 end) as present")
            ->selectRaw("sum(case when r.status = 'absent' then 1 else 0 end) as absent")
            ->selectRaw("sum(case when r.status = 'late' then 1 else 0 end) as late")
            ->selectRaw("sum(case when r.status = 'half_day' then 1 else 0 end) as half_day")
            ->selectRaw("sum(case when r.status = 'excused' then 1 else 0 end) as excused")
            ->groupBy('sessions.class_id', 'c.name')
            ->orderBy('class_name')
            ->get()
            ->map(function ($row) {
                $attended = (int) $row->present + (int) $row->late + (int) $row->half_day + (int) $row->excused;

                return [
                    'class_id' => $row->class_id,
                    'class_name' => $row->class_name,
                    'sessions' => (int) $row->sessions,
                    'records' => (int) $row->records,
                    'present' => (int) $row->present,
                    'absent' => (int) $row->absent,
                    'late' => (int) $row->late,
                    'half_day' => (int) $row->half_day,
                    'excused' => (int) $row->excused,
                    'attendance_rate' => (int) $row->records > 0 ? (int) round(($attended / (int) $row->records) * 100) : 0,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    private function examByClass(int $schoolId, array $filters): array
    {
        return $this->examResultQuery($schoolId, $filters)
            ->leftJoin('classes as c', 'c.id', '=', 'r.class_id')
            ->selectRaw('r.class_id, COALESCE(c.name, "Unassigned") as class_name')
            ->selectRaw('count(r.id) as results')
            ->selectRaw("sum(case when r.result_status = 'pass' then 1 else 0 end) as passed")
            ->selectRaw("sum(case when r.result_status = 'fail' then 1 else 0 end) as failed")
            ->selectRaw('avg(r.percentage) as average_percentage')
            ->groupBy('r.class_id', 'c.name')
            ->orderBy('class_name')
            ->get()
            ->map(fn ($row) => [
                'class_id' => $row->class_id,
                'class_name' => $row->class_name,
                'results' => (int) $row->results,
                'passed' => (int) $row->passed,
                'failed' => (int) $row->failed,
                'average_percentage' => round((float) $row->average_percentage, 2),
                'pass_rate' => (int) $row->results > 0 ? (int) round(((int) $row->passed / (int) $row->results) * 100) : 0,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{date: string, label: string, events: int}>
     */
    private function activityTrend(int $schoolId, string $from, string $to): array
    {
        $start = CarbonImmutable::parse($from);
        $end = CarbonImmutable::parse($to);
        $days = min($start->diffInDays($end) + 1, 31);
        $trendStart = $end->subDays($days - 1);

        $events = AuditLog::forSchool($schoolId)
            ->whereDate('created_at', '>=', $trendStart->toDateString())
            ->whereDate('created_at', '<=', $end->toDateString())
            ->get(['created_at'])
            ->groupBy(fn (AuditLog $log) => $log->created_at?->format('Y-m-d'))
            ->map->count();

        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $day = $trendStart->addDays($i);
            $key = $day->format('Y-m-d');
            $series[] = [
                'date' => $key,
                'label' => $day->format('M j'),
                'events' => (int) ($events[$key] ?? 0),
            ];
        }

        return $series;
    }
}
