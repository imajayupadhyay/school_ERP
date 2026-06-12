<?php

namespace Tests\Feature\Reports;

use App\Models\AcademicSession;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\FeeInvoice;
use App\Models\FeePayment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentFeeAssignment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportAndAuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    private function makeSchool(string $code): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code]);
    }

    private function makeUser(School $school, string $role = 'school_admin', string $name = 'Admin User'): User
    {
        return User::factory()->create([
            'school_id' => $school->id,
            'name' => $name,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    /**
     * @return array{school: School, admin: User, teacher: User, class: SchoolClass, section: Section, session: AcademicSession, student: Student}
     */
    private function seedReportScope(string $code = 'Demo'): array
    {
        $school = $this->makeSchool($code);
        $admin = $this->makeUser($school, 'school_admin', "{$code} Admin");
        $teacher = $this->makeUser($school, 'teacher', "{$code} Teacher");
        $session = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2026-27',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
        $class = SchoolClass::create([
            'school_id' => $school->id,
            'name' => "Class {$code}",
            'sequence' => 1,
            'status' => 'active',
        ]);
        $section = Section::create([
            'school_id' => $school->id,
            'class_id' => $class->id,
            'name' => 'A',
            'status' => 'active',
        ]);
        $student = Student::create([
            'school_id' => $school->id,
            'academic_session_id' => $session->id,
            'class_id' => $class->id,
            'section_id' => $section->id,
            'first_name' => "{$code} Student",
            'class_name' => $class->name,
            'section' => $section->name,
            'status' => 'active',
            'admission_date' => '2026-06-03',
        ]);

        return compact('school', 'admin', 'teacher', 'class', 'section', 'session', 'student');
    }

    public function test_manager_can_view_school_report_overview_without_tenant_leakage(): void
    {
        CarbonImmutable::setTestNow('2026-06-12 10:00:00');
        $scope = $this->seedReportScope();
        $other = $this->seedReportScope('Other');

        $assignment = StudentFeeAssignment::create([
            'school_id' => $scope['school']->id,
            'student_id' => $scope['student']->id,
            'academic_session_id' => $scope['session']->id,
            'status' => 'active',
        ]);
        $invoice = FeeInvoice::create([
            'school_id' => $scope['school']->id,
            'student_id' => $scope['student']->id,
            'student_fee_assignment_id' => $assignment->id,
            'invoice_no' => 'INV-DEMO-1',
            'period_label' => 'June',
            'due_date' => '2026-06-05',
            'total_amount' => 1000,
            'paid_amount' => 400,
            'status' => 'partial',
        ]);
        FeePayment::create([
            'school_id' => $scope['school']->id,
            'student_id' => $scope['student']->id,
            'fee_invoice_id' => $invoice->id,
            'receipt_no' => 'RCP-DEMO-1',
            'amount' => 400,
            'mode' => 'cash',
            'paid_on' => '2026-06-06',
            'status' => 'completed',
        ]);

        $attendance = AttendanceSession::create([
            'school_id' => $scope['school']->id,
            'academic_session_id' => $scope['session']->id,
            'class_id' => $scope['class']->id,
            'section_id' => $scope['section']->id,
            'attendance_date' => '2026-06-10',
            'marked_by' => $scope['admin']->id,
            'status' => 'submitted',
        ]);
        AttendanceRecord::create([
            'school_id' => $scope['school']->id,
            'attendance_session_id' => $attendance->id,
            'student_id' => $scope['student']->id,
            'status' => 'present',
        ]);

        $exam = Exam::create([
            'school_id' => $scope['school']->id,
            'academic_session_id' => $scope['session']->id,
            'name' => 'Term I',
            'exam_type' => 'term',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-10',
            'status' => 'published',
        ]);
        ExamResult::create([
            'school_id' => $scope['school']->id,
            'exam_id' => $exam->id,
            'student_id' => $scope['student']->id,
            'class_id' => $scope['class']->id,
            'section_id' => $scope['section']->id,
            'total_marks' => 100,
            'obtained_marks' => 80,
            'percentage' => 80,
            'grade' => 'A',
            'result_status' => 'pass',
            'status' => 'published',
            'published_at' => '2026-06-11 10:00:00',
            'published_by' => $scope['admin']->id,
        ]);
        AuditLog::create([
            'school_id' => $scope['school']->id,
            'user_id' => $scope['admin']->id,
            'action' => 'student.created',
            'changes' => ['first_name' => ['old' => null, 'new' => 'Demo Student']],
            'created_at' => '2026-06-11 09:00:00',
        ]);

        // Other-school data must not be counted.
        $otherAssignment = StudentFeeAssignment::create([
            'school_id' => $other['school']->id,
            'student_id' => $other['student']->id,
            'academic_session_id' => $other['session']->id,
            'status' => 'active',
        ]);
        FeeInvoice::create([
            'school_id' => $other['school']->id,
            'student_id' => $other['student']->id,
            'student_fee_assignment_id' => $otherAssignment->id,
            'invoice_no' => 'INV-OTHER-1',
            'period_label' => 'June',
            'due_date' => '2026-06-05',
            'total_amount' => 9999,
            'paid_amount' => 0,
            'status' => 'pending',
        ]);
        AuditLog::create([
            'school_id' => $other['school']->id,
            'user_id' => $other['admin']->id,
            'action' => 'fee_payment.created',
            'created_at' => '2026-06-11 09:00:00',
        ]);

        $this->actingAs($scope['admin'])
            ->getJson("/api/v1/reports/overview?from=2026-06-01&to=2026-06-30&academic_session_id={$scope['session']->id}")
            ->assertOk()
            ->assertJsonPath('data.students.total', 1)
            ->assertJsonPath('data.students.new_admissions', 1)
            ->assertJsonPath('data.fees.billed', 1000)
            ->assertJsonPath('data.fees.collected', 400)
            ->assertJsonPath('data.fees.outstanding', 600)
            ->assertJsonPath('data.fees.overdue', 600)
            ->assertJsonPath('data.attendance.records', 1)
            ->assertJsonPath('data.attendance.attendance_rate', 100)
            ->assertJsonPath('data.exams.published_results', 1)
            ->assertJsonPath('data.exams.pass_rate', 100)
            ->assertJsonPath('data.audit.events', 1)
            ->assertJsonPath('data.fee_by_class.0.class_name', $scope['class']->name);
    }

    public function test_audit_log_index_and_summary_are_filterable_and_scoped(): void
    {
        $scope = $this->seedReportScope();
        $other = $this->seedReportScope('Other');

        AuditLog::create([
            'school_id' => $scope['school']->id,
            'user_id' => $scope['admin']->id,
            'action' => 'student.created',
            'auditable_type' => Student::class,
            'auditable_id' => $scope['student']->id,
            'changes' => ['first_name' => ['old' => null, 'new' => 'Demo Student']],
            'ip_address' => '127.0.0.1',
            'created_at' => '2026-06-11 09:00:00',
        ]);
        AuditLog::create([
            'school_id' => $scope['school']->id,
            'user_id' => $scope['admin']->id,
            'action' => 'fee_payment.created',
            'created_at' => '2026-06-11 10:00:00',
        ]);
        AuditLog::create([
            'school_id' => $other['school']->id,
            'user_id' => $other['admin']->id,
            'action' => 'student.created',
            'created_at' => '2026-06-11 11:00:00',
        ]);

        $this->actingAs($scope['admin'])
            ->getJson('/api/v1/reports/audit-logs?from=2026-06-01&to=2026-06-30&module=student&search=Demo%20Admin')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.items.0.action', 'student.created')
            ->assertJsonPath('data.items.0.module', 'student')
            ->assertJsonPath('data.items.0.actor.name', 'Demo Admin')
            ->assertJsonPath('data.items.0.changed_fields.0', 'first_name');

        $this->actingAs($scope['admin'])
            ->getJson('/api/v1/reports/audit-logs/summary?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.actors', 1)
            ->assertJsonCount(2, 'data.modules')
            ->assertJsonPath('data.recent.0.action', 'fee_payment.created');
    }

    public function test_teachers_cannot_view_reports_or_audit_logs(): void
    {
        $scope = $this->seedReportScope();

        $this->actingAs($scope['teacher'])
            ->getJson('/api/v1/reports/overview?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();

        $this->actingAs($scope['teacher'])
            ->getJson('/api/v1/reports/audit-logs?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();
    }
}
