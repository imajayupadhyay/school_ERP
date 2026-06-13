<?php

namespace App\Services\Platform;

use App\Models\Employee;
use App\Models\Guardian;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Platform-wide aggregates for the Super Admin dashboard.
 *
 * Runs as the platform owner (school_id = null), so the BelongsToSchool
 * global scope is inert; we still call ->allSchools() explicitly on
 * tenant models to make the cross-tenant intent obvious and robust.
 */
class PlatformDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function overview(): array
    {
        $now = Carbon::now();

        $totalSchools = School::count();
        $activeSchools = School::where('status', 'active')->count();
        $newSchoolsThisMonth = School::where('created_at', '>=', $now->copy()->startOfMonth())->count();

        $byStatus = School::query()
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->map(fn ($c) => (int) $c)
            ->toArray();

        return [
            'totals' => [
                'schools' => $totalSchools,
                'active_schools' => $activeSchools,
                'inactive_schools' => $totalSchools - $activeSchools,
                'new_schools_this_month' => $newSchoolsThisMonth,
                'users' => User::count(),
                'students' => Student::allSchools()->count(),
                'employees' => Employee::allSchools()->count(),
                'guardians' => Guardian::allSchools()->count(),
            ],
            'schools_by_status' => $byStatus,
            'growth_trend' => $this->growthTrend($now),
            'recent_schools' => $this->recentSchools(),
            'top_schools' => $this->topSchools(),
        ];
    }

    /**
     * New schools per month for the last 6 months (oldest → newest).
     *
     * @return array<int, array{label: string, value: int}>
     */
    private function growthTrend(Carbon $now): array
    {
        $trend = [];

        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $trend[] = [
                'label' => $month->format('M'),
                'value' => School::whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->count(),
            ];
        }

        return $trend;
    }

    /**
     * Most recently onboarded schools.
     *
     * @return array<int, array<string, mixed>>
     */
    private function recentSchools(): array
    {
        return School::withCount('students')
            ->latest()
            ->take(8)
            ->get()
            ->map(fn (School $s) => $this->schoolSummary($s))
            ->all();
    }

    /**
     * Largest schools by enrolled students.
     *
     * @return array<int, array<string, mixed>>
     */
    private function topSchools(): array
    {
        return School::withCount('students')
            ->orderByDesc('students_count')
            ->take(6)
            ->get()
            ->map(fn (School $s) => $this->schoolSummary($s))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function schoolSummary(School $school): array
    {
        return [
            'id' => $school->id,
            'name' => $school->name,
            'code' => $school->code,
            'city' => $school->city,
            'status' => $school->status,
            'students_count' => (int) ($school->students_count ?? 0),
            'created_at' => $school->created_at?->toIso8601String(),
        ];
    }
}
