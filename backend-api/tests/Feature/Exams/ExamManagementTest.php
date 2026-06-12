<?php

namespace Tests\Feature\Exams;

use App\Models\AcademicSession;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\EmployeeAssignment;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamManagementTest extends TestCase
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
     * @return array{session: AcademicSession, class: SchoolClass, section: Section, subjects: array<int, Subject>}
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
        $subjects = collect(['Mathematics', 'Science'])->map(function (string $name) use ($school, $class, $className) {
            $subject = Subject::create([
                'school_id' => $school->id,
                'name' => "{$name} {$className}",
                'code' => strtoupper(substr($name, 0, 4)).$class->sequence,
            ]);
            $subject->classes()->attach($class->id, ['school_id' => $school->id]);

            return $subject;
        })->all();

        return compact('session', 'class', 'section', 'subjects');
    }

    private function makeStudent(School $school, array $setup, string $name, string $roll): Student
    {
        return Student::create([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'admission_no' => 'ADM'.random_int(1000, 9999),
            'first_name' => $name,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'class_name' => $setup['class']->name,
            'section' => $setup['section']->name,
            'roll_no' => $roll,
            'status' => 'active',
        ]);
    }

    private function makeExam(School $school, array $setup, array $overrides = []): Exam
    {
        return Exam::create(array_merge([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'name' => 'Midterm Examination',
            'exam_type' => 'midterm',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-10',
            'status' => 'scheduled',
        ], $overrides));
    }

    private function makeSchedule(School $school, Exam $exam, array $setup, Subject $subject, array $overrides = []): ExamSchedule
    {
        return ExamSchedule::create(array_merge([
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'subject_id' => $subject->id,
            'exam_date' => '2026-09-02',
            'start_time' => '09:00',
            'end_time' => '11:00',
            'max_marks' => 100,
            'passing_marks' => 35,
            'status' => 'scheduled',
        ], $overrides));
    }

    private function assignTeacher(User $teacher, array $setup, Subject $subject): void
    {
        $employee = Employee::create([
            'school_id' => $teacher->school_id,
            'user_id' => $teacher->id,
            'employee_code' => 'EMP'.random_int(100, 999),
            'first_name' => 'Anita',
            'employee_type' => 'teaching',
            'status' => 'active',
        ]);

        EmployeeAssignment::create([
            'school_id' => $teacher->school_id,
            'employee_id' => $employee->id,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'subject_id' => $subject->id,
            'assignment_type' => 'subject_teacher',
            'status' => 'active',
        ]);
    }

    public function test_admin_can_create_exam_and_schedule_with_audit_logs(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);

        $examResponse = $this->actingAs($admin)->postJson('/api/v1/exams', [
            'academic_session_id' => $setup['session']->id,
            'name' => 'Midterm Examination',
            'exam_type' => 'midterm',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-10',
            'status' => 'scheduled',
        ]);

        $examResponse->assertCreated();
        $examId = $examResponse->json('data.id');

        $this->actingAs($admin)->postJson('/api/v1/exam-schedules', [
            'exam_id' => $examId,
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
            'subject_id' => $setup['subjects'][0]->id,
            'exam_date' => '2026-09-02',
            'start_time' => '09:00',
            'end_time' => '11:00',
            'max_marks' => 100,
            'passing_marks' => 35,
        ])->assertCreated();

        $this->assertNotNull(AuditLog::where('action', 'exam.created')->first());
        $this->assertNotNull(AuditLog::where('action', 'exam_schedule.created')->first());
    }

    public function test_schedule_validation_rejects_invalid_section_subject_date_and_marks(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $other = $this->makeSetup($school, 'Class 6', 'B');
        $exam = $this->makeExam($school, $setup);

        $this->actingAs($admin)->postJson('/api/v1/exam-schedules', [
            'exam_id' => $exam->id,
            'class_id' => $setup['class']->id,
            'section_id' => $other['section']->id,
            'subject_id' => $other['subjects'][0]->id,
            'exam_date' => '2026-09-20',
            'max_marks' => 50,
            'passing_marks' => 60,
        ])->assertStatus(422)->assertJsonValidationErrors([
            'section_id',
            'subject_id',
            'exam_date',
            'passing_marks',
        ]);
    }

    public function test_assigned_teacher_can_enter_marks_but_unassigned_teacher_cannot(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');
        $otherTeacher = $this->makeUser($school, 'teacher');
        $setup = $this->makeSetup($school);
        $exam = $this->makeExam($school, $setup);
        $schedule = $this->makeSchedule($school, $exam, $setup, $setup['subjects'][0]);
        $student = $this->makeStudent($school, $setup, 'Aarav', '1');
        $this->assignTeacher($teacher, $setup, $setup['subjects'][0]);

        $this->actingAs($teacher)
            ->putJson("/api/v1/exam-schedules/{$schedule->id}/marks", [
                'status' => 'submitted',
                'records' => [
                    ['student_id' => $student->id, 'marks_obtained' => 82, 'attendance_status' => 'present'],
                ],
            ])->assertOk()->assertJsonPath('data.students.0.marks_obtained', 82);

        $this->actingAs($otherTeacher)
            ->getJson("/api/v1/exam-schedules/{$schedule->id}/marks")
            ->assertStatus(403);
    }

    public function test_marks_validation_handles_limits_absent_and_exempt_states(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $exam = $this->makeExam($school, $setup);
        $schedule = $this->makeSchedule($school, $exam, $setup, $setup['subjects'][0]);
        $students = [
            $this->makeStudent($school, $setup, 'Aarav', '1'),
            $this->makeStudent($school, $setup, 'Diya', '2'),
        ];

        $this->actingAs($admin)->putJson("/api/v1/exam-schedules/{$schedule->id}/marks", [
            'records' => [
                ['student_id' => $students[0]->id, 'marks_obtained' => 120, 'attendance_status' => 'present'],
                ['student_id' => $students[1]->id, 'marks_obtained' => 10, 'attendance_status' => 'absent'],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors([
            'records.0.marks_obtained',
            'records.1.marks_obtained',
        ]);

        $this->actingAs($admin)->putJson("/api/v1/exam-schedules/{$schedule->id}/marks", [
            'status' => 'submitted',
            'records' => [
                ['student_id' => $students[0]->id, 'attendance_status' => 'absent'],
                ['student_id' => $students[1]->id, 'attendance_status' => 'exempt'],
            ],
        ])->assertOk();
    }

    public function test_publishing_results_calculates_totals_grades_and_pass_fail(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $exam = $this->makeExam($school, $setup);
        $math = $this->makeSchedule($school, $exam, $setup, $setup['subjects'][0]);
        $science = $this->makeSchedule($school, $exam, $setup, $setup['subjects'][1], ['exam_date' => '2026-09-03']);
        $studentOne = $this->makeStudent($school, $setup, 'Aarav', '1');
        $studentTwo = $this->makeStudent($school, $setup, 'Diya', '2');

        foreach ([
            [$math, [82, 30]],
            [$science, [78, 65]],
        ] as [$schedule, $scores]) {
            $this->actingAs($admin)->putJson("/api/v1/exam-schedules/{$schedule->id}/marks", [
                'status' => 'submitted',
                'records' => [
                    ['student_id' => $studentOne->id, 'marks_obtained' => $scores[0], 'attendance_status' => 'present'],
                    ['student_id' => $studentTwo->id, 'marks_obtained' => $scores[1], 'attendance_status' => 'present'],
                ],
            ])->assertOk();
        }

        $this->actingAs($admin)->postJson("/api/v1/exams/{$exam->id}/results/publish", [
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
        ])->assertOk()->assertJsonPath('data.count', 2);

        $this->assertDatabaseHas('exam_results', [
            'student_id' => $studentOne->id,
            'total_marks' => 200,
            'obtained_marks' => 160,
            'percentage' => 80,
            'grade' => 'A',
            'result_status' => 'pass',
            'status' => 'published',
        ]);
        $this->assertDatabaseHas('exam_results', [
            'student_id' => $studentTwo->id,
            'result_status' => 'fail',
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/exams/{$exam->id}/students/{$studentOne->id}/result")
            ->assertOk()
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.percentage', 80);

        $this->assertNotNull(AuditLog::where('action', 'exam_results.published')->first());
    }

    public function test_publish_is_blocked_when_marks_are_incomplete(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $exam = $this->makeExam($school, $setup);
        $this->makeSchedule($school, $exam, $setup, $setup['subjects'][0]);
        $this->makeStudent($school, $setup, 'Aarav', '1');

        $this->actingAs($admin)->postJson("/api/v1/exams/{$exam->id}/results/publish", [
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['marks']);
    }

    public function test_published_results_lock_marks_until_unpublished(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $exam = $this->makeExam($school, $setup);
        $schedule = $this->makeSchedule($school, $exam, $setup, $setup['subjects'][0]);
        $student = $this->makeStudent($school, $setup, 'Aarav', '1');
        $payload = [
            'status' => 'submitted',
            'records' => [
                ['student_id' => $student->id, 'marks_obtained' => 75, 'attendance_status' => 'present'],
            ],
        ];

        $this->actingAs($admin)->putJson("/api/v1/exam-schedules/{$schedule->id}/marks", $payload)->assertOk();
        $this->actingAs($admin)->postJson("/api/v1/exams/{$exam->id}/results/publish", [
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
        ])->assertOk();

        $this->actingAs($admin)->putJson("/api/v1/exam-schedules/{$schedule->id}/marks", $payload)
            ->assertStatus(422)->assertJsonValidationErrors(['records']);

        $this->actingAs($admin)->postJson("/api/v1/exams/{$exam->id}/results/unpublish", [
            'class_id' => $setup['class']->id,
            'section_id' => $setup['section']->id,
        ])->assertOk()->assertJsonPath('data.count', 1);

        $this->assertSame(0, ExamResult::where('exam_id', $exam->id)->count());
        $this->actingAs($admin)->putJson("/api/v1/exam-schedules/{$schedule->id}/marks", $payload)->assertOk();
    }

    public function test_exam_and_results_are_tenant_scoped(): void
    {
        $school = $this->makeSchool('A');
        $otherSchool = $this->makeSchool('B');
        $admin = $this->makeUser($school, 'school_admin');
        $otherAdmin = $this->makeUser($otherSchool, 'school_admin');
        $setup = $this->makeSetup($school);
        $otherSetup = $this->makeSetup($otherSchool);
        $this->makeExam($school, $setup, ['name' => 'Visible Exam']);
        $otherExam = $this->makeExam($otherSchool, $otherSetup, ['name' => 'Hidden Exam']);

        $this->actingAs($admin)
            ->getJson('/api/v1/exams')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Visible Exam'])
            ->assertJsonMissing(['name' => 'Hidden Exam']);

        $this->actingAs($admin)->getJson("/api/v1/exams/{$otherExam->id}")->assertNotFound();
        $this->actingAs($otherAdmin)->getJson("/api/v1/exams/{$otherExam->id}")->assertOk();
    }
}
