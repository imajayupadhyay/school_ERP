<?php

namespace Tests\Feature\Dashboard;

use App\Models\AcademicSession;
use App\Models\FeeInvoice;
use App\Models\FeePayment;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentFeeAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code = 'Demo'): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code]);
    }

    private function makeUser(School $school, string $role = 'school_admin'): User
    {
        return User::factory()->create(['school_id' => $school->id, 'role' => $role, 'status' => 'active']);
    }

    /**
     * @return array{0: Student, 1: FeeInvoice}
     */
    private function seedInvoice(School $school, string $invoiceNo, float $total, float $paid, string $dueDate, string $status): array
    {
        $student = Student::create(['school_id' => $school->id, 'first_name' => 'S'.$invoiceNo, 'status' => 'active']);
        $session = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2026-27',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
        $assignment = StudentFeeAssignment::create([
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_session_id' => $session->id,
            'status' => 'active',
        ]);
        $invoice = FeeInvoice::create([
            'school_id' => $school->id,
            'student_id' => $student->id,
            'student_fee_assignment_id' => $assignment->id,
            'invoice_no' => $invoiceNo,
            'period_label' => 'April',
            'due_date' => $dueDate,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'status' => $status,
        ]);

        return [$student, $invoice];
    }

    public function test_dashboard_returns_extended_analytics_payload(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school);

        Student::create([
            'school_id' => $school->id,
            'first_name' => 'Asha',
            'class_name' => 'Class 5',
            'section' => 'A',
            'gender' => 'female',
            'status' => 'active',
            'admission_date' => now()->toDateString(),
        ]);

        $this->actingAs($admin)
            ->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'school' => ['id', 'code', 'name'],
                    'stats' => ['students_total', 'students_active', 'staff_total', 'teachers_total', 'classes_total', 'sections_total'],
                    'fees' => ['billed', 'collected', 'outstanding', 'overdue', 'collection_rate'],
                    'fee_status' => ['paid', 'partial', 'pending', 'overdue'],
                    'collection_trend',
                    'attendance_today' => ['present', 'absent', 'late', 'excused', 'total', 'rate'],
                    'attendance_trend',
                    'admissions_trend',
                    'students_by_gender' => ['male', 'female', 'other'],
                    'students_by_class',
                    'recent_students',
                ],
            ])
            ->assertJsonPath('data.stats.students_total', 1)
            ->assertJsonCount(6, 'data.collection_trend')
            ->assertJsonCount(7, 'data.attendance_trend')
            ->assertJsonCount(6, 'data.admissions_trend');
    }

    public function test_fee_summary_reflects_invoices_and_payments_scoped_to_school(): void
    {
        $school = $this->makeSchool();
        $other = $this->makeSchool('Other');
        $admin = $this->makeUser($school);

        [$student, $invoice] = $this->seedInvoice($school, 'INV-1', 1000, 400, now()->subDay()->toDateString(), 'partial');

        FeePayment::create([
            'school_id' => $school->id,
            'student_id' => $student->id,
            'fee_invoice_id' => $invoice->id,
            'receipt_no' => 'RCP-1',
            'amount' => 400,
            'mode' => 'cash',
            'paid_on' => now()->toDateString(),
            'status' => 'completed',
        ]);

        // A different school's invoice must not leak into the summary.
        $this->seedInvoice($other, 'INV-X', 9999, 0, now()->toDateString(), 'pending');

        $this->actingAs($admin)
            ->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.fees.billed', 1000)
            ->assertJsonPath('data.fees.collected', 400)
            ->assertJsonPath('data.fees.outstanding', 600)
            ->assertJsonPath('data.fees.overdue', 600)
            ->assertJsonPath('data.fees.collection_rate', 40)
            ->assertJsonPath('data.fee_status.overdue', 1);
    }
}
