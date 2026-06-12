<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\School;
use App\Models\Student;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates the School Admin dashboard payload. All queries are scoped to a
 * single school — tenancy is enforced here, never trusted from the client.
 */
class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function forSchool(School $school): array
    {
        $schoolId = $school->id;

        $studentsTotal = Student::forSchool($schoolId)->count();
        $studentsActive = Student::forSchool($schoolId)->where('status', 'active')->count();

        $staffTotal = Employee::forSchool($schoolId)
            ->whereIn('status', ['active', 'on_leave'])
            ->count();
        $teachersTotal = Employee::forSchool($schoolId)
            ->where('employee_type', 'teaching')
            ->whereIn('status', ['active', 'on_leave'])
            ->count();

        $classesTotal = Student::forSchool($schoolId)
            ->whereNotNull('class_name')
            ->distinct()
            ->count('class_name');

        $sectionsTotal = Student::forSchool($schoolId)
            ->whereNotNull('class_name')
            ->select('class_name', 'section')
            ->distinct()
            ->get()
            ->count();

        return [
            'stats' => [
                'students_total' => $studentsTotal,
                'students_active' => $studentsActive,
                'staff_total' => $staffTotal,
                'teachers_total' => $teachersTotal,
                'classes_total' => $classesTotal,
                'sections_total' => $sectionsTotal,
            ],
            'fees' => $this->feeSummary($schoolId),
            'fee_status' => $this->feeStatusBreakdown($schoolId),
            'collection_trend' => $this->collectionTrend($schoolId),
            'attendance_today' => $this->attendanceToday($schoolId),
            'attendance_trend' => $this->attendanceTrend($schoolId),
            'admissions_trend' => $this->admissionsTrend($schoolId),
            'students_by_gender' => $this->studentsByGender($schoolId),
            'students_by_class' => $this->studentsByClass($schoolId),
            'recent_students' => $this->recentStudents($schoolId),
        ];
    }

    /**
     * Fee collection headline: billed, collected, outstanding, and overdue.
     *
     * @return array<string, float|int>
     */
    private function feeSummary(int $schoolId): array
    {
        $base = DB::table('fee_invoices')
            ->where('school_id', $schoolId)
            ->where('status', '!=', 'cancelled');

        $billed = (float) (clone $base)->sum('total_amount');
        $collected = (float) (clone $base)->sum('paid_amount');
        $outstanding = round($billed - $collected, 2);

        $overdueAmount = (float) (clone $base)
            ->whereRaw('total_amount - paid_amount > 0')
            ->whereDate('due_date', '<', CarbonImmutable::today()->toDateString())
            ->sum(DB::raw('total_amount - paid_amount'));

        return [
            'billed' => round($billed, 2),
            'collected' => round($collected, 2),
            'outstanding' => $outstanding,
            'overdue' => round($overdueAmount, 2),
            'collection_rate' => $billed > 0 ? (int) round(($collected / $billed) * 100) : 0,
        ];
    }

    /**
     * Invoice counts by effective status (overdue derived from balance + due date).
     *
     * @return array<string, int>
     */
    private function feeStatusBreakdown(int $schoolId): array
    {
        $today = CarbonImmutable::today()->toDateString();

        $paid = DB::table('fee_invoices')->where('school_id', $schoolId)->where('status', 'paid')->count();
        $partial = DB::table('fee_invoices')->where('school_id', $schoolId)->where('status', 'partial')->count();

        $overdue = DB::table('fee_invoices')
            ->where('school_id', $schoolId)
            ->whereNotIn('status', ['paid', 'cancelled'])
            ->whereRaw('total_amount - paid_amount > 0')
            ->whereDate('due_date', '<', $today)
            ->count();

        $pending = DB::table('fee_invoices')
            ->where('school_id', $schoolId)
            ->whereNotIn('status', ['paid', 'cancelled'])
            ->whereRaw('total_amount - paid_amount > 0')
            ->whereDate('due_date', '>=', $today)
            ->count();

        return [
            'paid' => $paid,
            'partial' => $partial,
            'pending' => $pending,
            'overdue' => $overdue,
        ];
    }

    /**
     * Completed payment totals for the last 6 calendar months.
     *
     * @return array<int, array{label: string, month: string, amount: float}>
     */
    private function collectionTrend(int $schoolId): array
    {
        $start = CarbonImmutable::today()->startOfMonth()->subMonths(5);

        // Group in PHP (not DATE_FORMAT) so the query stays portable across MySQL/SQLite.
        $payments = DB::table('fee_payments')
            ->where('school_id', $schoolId)
            ->where('status', 'completed')
            ->whereDate('paid_on', '>=', $start->toDateString())
            ->get(['paid_on', 'amount']);

        $totals = [];
        foreach ($payments as $payment) {
            $key = CarbonImmutable::parse($payment->paid_on)->format('Y-m');
            $totals[$key] = ($totals[$key] ?? 0) + (float) $payment->amount;
        }

        $series = [];
        for ($i = 0; $i < 6; $i++) {
            $month = $start->addMonths($i);
            $key = $month->format('Y-m');
            $series[] = [
                'label' => $month->format('M'),
                'month' => $key,
                'amount' => round((float) ($totals[$key] ?? 0), 2),
            ];
        }

        return $series;
    }

    /**
     * Attendance breakdown for the most recent marked day (today or earlier).
     *
     * @return array<string, mixed>
     */
    private function attendanceToday(int $schoolId): array
    {
        $latestDate = DB::table('attendance_sessions')
            ->where('school_id', $schoolId)
            ->whereDate('attendance_date', '<=', CarbonImmutable::today()->toDateString())
            ->max('attendance_date');

        $empty = ['date' => null, 'present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0, 'total' => 0, 'rate' => 0];

        if (! $latestDate) {
            return $empty;
        }

        $counts = DB::table('attendance_records as r')
            ->join('attendance_sessions as s', 'r.attendance_session_id', '=', 's.id')
            ->where('r.school_id', $schoolId)
            ->whereDate('s.attendance_date', $latestDate)
            ->select('r.status', DB::raw('count(*) as c'))
            ->groupBy('r.status')
            ->pluck('c', 'status');

        $present = (int) ($counts['present'] ?? 0);
        $absent = (int) ($counts['absent'] ?? 0);
        $late = (int) ($counts['late'] ?? 0);
        $halfDay = (int) ($counts['half_day'] ?? 0);
        $excused = (int) ($counts['excused'] ?? 0);
        $total = $present + $absent + $late + $halfDay + $excused;
        $attended = $present + $late + $halfDay;

        return [
            'date' => $latestDate,
            'present' => $present,
            'absent' => $absent,
            'late' => $late,
            'excused' => $excused + $halfDay,
            'total' => $total,
            'rate' => $total > 0 ? (int) round(($attended / $total) * 100) : 0,
        ];
    }

    /**
     * Daily attendance rate for the last 7 marked-or-calendar days.
     *
     * @return array<int, array{label: string, date: string, rate: int}>
     */
    private function attendanceTrend(int $schoolId): array
    {
        $start = CarbonImmutable::today()->subDays(6);

        $rows = DB::table('attendance_records as r')
            ->join('attendance_sessions as s', 'r.attendance_session_id', '=', 's.id')
            ->where('r.school_id', $schoolId)
            ->whereDate('s.attendance_date', '>=', $start->toDateString())
            ->select('s.attendance_date as date', 'r.status', DB::raw('count(*) as c'))
            ->groupBy('s.attendance_date', 'r.status')
            ->get();

        $byDate = [];
        foreach ($rows as $row) {
            $key = CarbonImmutable::parse($row->date)->format('Y-m-d');
            $byDate[$key][$row->status] = (int) $row->c;
        }

        $series = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $start->addDays($i);
            $key = $day->format('Y-m-d');
            $statuses = $byDate[$key] ?? [];
            $present = ($statuses['present'] ?? 0) + ($statuses['late'] ?? 0) + ($statuses['half_day'] ?? 0);
            $total = array_sum($statuses);
            $series[] = [
                'label' => $day->format('D'),
                'date' => $key,
                'rate' => $total > 0 ? (int) round(($present / $total) * 100) : 0,
            ];
        }

        return $series;
    }

    /**
     * Admissions per month for the last 6 calendar months.
     *
     * @return array<int, array{label: string, month: string, count: int}>
     */
    private function admissionsTrend(int $schoolId): array
    {
        $start = CarbonImmutable::today()->startOfMonth()->subMonths(5);

        // Group in PHP (not DATE_FORMAT) so the query stays portable across MySQL/SQLite.
        $dates = Student::forSchool($schoolId)
            ->whereNotNull('admission_date')
            ->whereDate('admission_date', '>=', $start->toDateString())
            ->pluck('admission_date');

        $totals = [];
        foreach ($dates as $date) {
            $key = CarbonImmutable::parse($date)->format('Y-m');
            $totals[$key] = ($totals[$key] ?? 0) + 1;
        }

        $series = [];
        for ($i = 0; $i < 6; $i++) {
            $month = $start->addMonths($i);
            $key = $month->format('Y-m');
            $series[] = [
                'label' => $month->format('M'),
                'month' => $key,
                'count' => (int) ($totals[$key] ?? 0),
            ];
        }

        return $series;
    }

    /**
     * @return array<string, int>
     */
    private function studentsByGender(int $schoolId): array
    {
        $rows = Student::forSchool($schoolId)
            ->select('gender', DB::raw('count(*) as total'))
            ->groupBy('gender')
            ->pluck('total', 'gender');

        return [
            'male' => (int) ($rows['male'] ?? 0),
            'female' => (int) ($rows['female'] ?? 0),
            'other' => (int) ($rows['other'] ?? 0),
        ];
    }

    /**
     * @return array<int, array{class_name: string, count: int}>
     */
    private function studentsByClass(int $schoolId): array
    {
        return Student::forSchool($schoolId)
            ->select('class_name', DB::raw('count(*) as count'))
            ->whereNotNull('class_name')
            ->groupBy('class_name')
            ->orderBy('class_name')
            ->get()
            ->map(fn ($row) => [
                'class_name' => (string) $row->class_name,
                'count' => (int) $row->count,
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentStudents(int $schoolId): array
    {
        return Student::forSchool($schoolId)
            ->latest('id')
            ->limit(6)
            ->get()
            ->map(fn (Student $s) => [
                'id' => $s->id,
                'name' => $s->full_name,
                'admission_no' => $s->admission_no,
                'class_name' => $s->class_name,
                'section' => $s->section,
                'gender' => $s->gender,
                'status' => $s->status,
                'admission_date' => $s->admission_date?->toDateString(),
            ])
            ->all();
    }
}
