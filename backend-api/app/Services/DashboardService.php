<?php

namespace App\Services;

use App\Models\School;
use App\Models\Student;
use App\Models\User;
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

        $staffRoles = ['principal', 'teacher', 'accountant', 'librarian', 'staff'];
        $staffTotal = User::where('school_id', $schoolId)->whereIn('role', $staffRoles)->count();
        $teachersTotal = User::where('school_id', $schoolId)->where('role', 'teacher')->count();

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
            'students_by_gender' => $this->studentsByGender($schoolId),
            'students_by_class' => $this->studentsByClass($schoolId),
            'recent_students' => $this->recentStudents($schoolId),
        ];
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
