<?php

namespace Tests\Feature\Attendance;

use App\Models\AcademicSession;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\EmployeeAssignment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code = 'Demo'): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code]);
    }

    private function makeUser(School $school, string $role): User
    {
        return User::factory()->create(['school_id' => $school->id, 'role' => $role, 'status' => 'active']);
    }

    /**
     * @return array{session: AcademicSession, class: SchoolClass, section: Section}
     */
    private function makeSetup(School $school, string $className = 'Class 5', string $sectionName = 'A'): array
    {
        $session = AcademicSession::firstOrCreate(
            ['school_id' => $school->id, 'name' => '2026-27'],
            [
                'start_date' => '2026-04-01',
                'end_date' => '2027-03-31',
                'is_current' => true,
                'status' => 'active',
            ],
        );
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => $className, 'sequence' => 5]);
        $section = Section::create(['school_id' => $school->id, 'class_id' => $class->id, 'name' => $sectionName]);

        return compact('session', 'class', 'section');
    }

    private function makeStudent(School $school, array $setup, array $overrides = []): Student
    {
        return Student::create(array_merge([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'admission_no' => 'ADM'.random_int(1000, 9999),
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'class_name' => $setup['class']->name,
            'section' => $setup['section']->name,
            'roll_no' => (string) random_int(1, 99),
            'status' => 'active',
        ], $overrides));
    }

    private function assignTeacher(User $teacher, array $setup): void
    {
        $employee = Employee::create([
            'school_id' => $teacher->school_id,
            'user_id' => $teacher->id,
            'employee_code' => 'EMP'.random_int(100, 999),
            'first_name' => 'Anita',
            'last_name' => 'Rao',
            'employee_type' => 'teaching',
            'status' => 'active',
        ]);

        EmployeeAssignment::create([
            'school_id' => $teacher->school_id,
            'employee_id' => $employee->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'assignment_type' => 'class_teacher',
            'status' => 'active',
        ]);
    }

    public function test_admin_can_load_roster_and_mark_attendance_with_audit_log(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $students = collect([
            $this->makeStudent($school, $setup, ['first_name' => 'Aarav', 'roll_no' => '1']),
            $this->makeStudent($school, $setup, ['first_name' => 'Diya', 'roll_no' => '2']),
            $this->makeStudent($school, $setup, ['first_name' => 'Kabir', 'roll_no' => '3']),
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/attendance/roster?academic_session_id={$setup['session']->id}&class_id={$setup['class']->id}&section_id={$setup['section']->id}&attendance_date=2026-06-10")
            ->assertOk()
            ->assertJsonPath('data.is_marked', false)
            ->assertJsonPath('data.summary.present', 3);

        $response = $this->actingAs($admin)->postJson('/api/v1/attendance/sessions', [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'attendance_date' => '2026-06-10',
            'records' => [
                ['student_id' => $students[0]->id, 'status' => 'present'],
                ['student_id' => $students[1]->id, 'status' => 'absent', 'remarks' => 'Sick leave'],
                ['student_id' => $students[2]->id, 'status' => 'late'],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.summary.total', 3);
        $response->assertJsonPath('data.summary.absent', 1);

        $this->assertTrue(
            AttendanceSession::where('school_id', $school->id)
                ->where('class_id', $setup['class']->id)
                ->where('section_id', $setup['section']->id)
                ->whereDate('attendance_date', '2026-06-10')
                ->exists(),
        );
        $this->assertDatabaseCount('attendance_records', 3);
        $this->assertNotNull(AuditLog::where('school_id', $school->id)->where('action', 'attendance.marked')->first());
    }

    public function test_marking_same_roster_updates_records_without_duplicate_session(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $studentOne = $this->makeStudent($school, $setup, ['roll_no' => '1']);
        $studentTwo = $this->makeStudent($school, $setup, ['roll_no' => '2']);

        $payload = [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'attendance_date' => '2026-06-11',
            'records' => [
                ['student_id' => $studentOne->id, 'status' => 'present'],
                ['student_id' => $studentTwo->id, 'status' => 'present'],
            ],
        ];

        $this->actingAs($admin)->postJson('/api/v1/attendance/sessions', $payload)->assertCreated();

        $payload['status'] = 'draft';
        $payload['records'] = [
            ['student_id' => $studentOne->id, 'status' => 'absent'],
        ];

        $this->actingAs($admin)->postJson('/api/v1/attendance/sessions', $payload)
            ->assertOk()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.summary.total', 1);

        $this->assertSame(1, AttendanceSession::where('school_id', $school->id)->count());
        $this->assertSame(1, AttendanceRecord::where('student_id', $studentOne->id)->where('status', 'absent')->count());
        $this->assertSame(0, AttendanceRecord::where('student_id', $studentTwo->id)->count());
        $this->assertNotNull(AuditLog::where('school_id', $school->id)->where('action', 'attendance.updated')->first());
    }

    public function test_assigned_teacher_can_mark_own_class_section(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $this->assignTeacher($teacher, $setup);

        $this->actingAs($teacher)->postJson('/api/v1/attendance/sessions', [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'attendance_date' => '2026-06-12',
            'records' => [
                ['student_id' => $student->id, 'status' => 'present'],
            ],
        ])->assertCreated();
    }

    public function test_unassigned_teacher_cannot_mark_other_roster(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);

        $this->actingAs($teacher)->postJson('/api/v1/attendance/sessions', [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'attendance_date' => '2026-06-12',
            'records' => [
                ['student_id' => $student->id, 'status' => 'present'],
            ],
        ])->assertStatus(403);
    }

    public function test_validation_rejects_student_outside_selected_roster(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $otherSetup = $this->makeSetup($school, 'Class 6', 'A');
        $student = $this->makeStudent($school, $otherSetup);

        $this->actingAs($admin)->postJson('/api/v1/attendance/sessions', [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'attendance_date' => '2026-06-12',
            'records' => [
                ['student_id' => $student->id, 'status' => 'present'],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['records']);
    }

    public function test_summary_is_tenant_scoped_and_counts_statuses(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $admin = $this->makeUser($school, 'school_admin');
        $otherAdmin = $this->makeUser($otherSchool, 'school_admin');
        $setup = $this->makeSetup($school);
        $otherSetup = $this->makeSetup($otherSchool);
        $studentOne = $this->makeStudent($school, $setup, ['roll_no' => '1']);
        $studentTwo = $this->makeStudent($school, $setup, ['roll_no' => '2']);
        $otherStudent = $this->makeStudent($otherSchool, $otherSetup, ['roll_no' => '1']);

        $this->actingAs($admin)->postJson('/api/v1/attendance/sessions', [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'attendance_date' => '2026-06-12',
            'records' => [
                ['student_id' => $studentOne->id, 'status' => 'present'],
                ['student_id' => $studentTwo->id, 'status' => 'absent'],
            ],
        ])->assertCreated();

        $this->actingAs($otherAdmin)->postJson('/api/v1/attendance/sessions', [
            'academic_session_id' => $otherSetup['session']->id,
            'class_id' => $otherSetup['class']->id,
            'section_id' => $otherSetup['section']->id,
            'attendance_date' => '2026-06-12',
            'records' => [
                ['student_id' => $otherStudent->id, 'status' => 'late'],
            ],
        ])->assertCreated();

        $this->actingAs($admin)
            ->getJson('/api/v1/attendance/reports/summary?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->assertJsonPath('data.sessions_count', 1)
            ->assertJsonPath('data.summary.present', 1)
            ->assertJsonPath('data.summary.absent', 1)
            ->assertJsonPath('data.summary.late', 0)
            ->assertJsonCount(2, 'data.items');
    }
}
