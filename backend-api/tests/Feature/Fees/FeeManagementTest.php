<?php

namespace Tests\Feature\Fees;

use App\Models\AcademicSession;
use App\Models\AuditLog;
use App\Models\FeeHead;
use App\Models\FeeInvoice;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentFeeAssignment;
use App\Models\StudentFeeItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchool(string $code = 'Demo'): School
    {
        return School::create(['name' => "{$code} School", 'code' => $code]);
    }

    private function makeUser(School $school, string $role): User
    {
        return User::factory()->create(['school_id' => $school->id, 'role' => $role]);
    }

    /**
     * @return array{session: AcademicSession, class: SchoolClass, section: Section}
     */
    private function makeSetup(School $school): array
    {
        // A full 12-month academic session: April 2026 .. March 2027.
        $session = AcademicSession::create([
            'school_id' => $school->id,
            'name' => '2026-27',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
        ]);
        $class = SchoolClass::create(['school_id' => $school->id, 'name' => 'Class 5', 'sequence' => 5]);
        $section = Section::create(['school_id' => $school->id, 'class_id' => $class->id, 'name' => 'A']);

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
            'status' => 'active',
        ], $overrides));
    }

    private function makeHead(School $school, string $name, bool $optional = false): FeeHead
    {
        return FeeHead::create([
            'school_id' => $school->id,
            'name' => $name,
            'is_optional' => $optional,
            'status' => 'active',
        ]);
    }

    /**
     * @param  array<int, array{head: FeeHead, amount: float|int, frequency: string, optional?: bool}>  $lines
     */
    private function makeStructure(School $school, array $setup, array $lines, string $name = 'Class 5 Plan'): FeeStructure
    {
        $structure = FeeStructure::create([
            'school_id' => $school->id,
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'name' => $name,
            'status' => 'active',
        ]);

        foreach ($lines as $line) {
            FeeStructureItem::create([
                'school_id' => $school->id,
                'fee_structure_id' => $structure->id,
                'fee_head_id' => $line['head']->id,
                'amount' => $line['amount'],
                'frequency' => $line['frequency'],
                'is_optional' => $line['optional'] ?? false,
            ]);
        }

        return $structure;
    }

    // ---------------------------------------------------------------- Fee heads

    public function test_admin_can_create_fee_head_with_audit_log(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/fee-heads', [
            'name' => 'Tuition Fee',
            'code' => 'TUI',
            'is_optional' => false,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'Tuition Fee');
        $this->assertDatabaseHas('fee_heads', ['school_id' => $school->id, 'name' => 'Tuition Fee']);
        $this->assertNotNull(AuditLog::where('action', 'fee_head.created')->first());
    }

    public function test_teacher_cannot_create_fee_head(): void
    {
        $school = $this->makeSchool();
        $teacher = $this->makeUser($school, 'teacher');

        $this->actingAs($teacher)
            ->postJson('/api/v1/fee-heads', ['name' => 'Tuition Fee'])
            ->assertStatus(403);
    }

    public function test_fee_head_name_must_be_unique_per_school(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $this->makeHead($school, 'Tuition Fee');

        $this->actingAs($admin)
            ->postJson('/api/v1/fee-heads', ['name' => 'Tuition Fee'])
            ->assertStatus(422);
    }

    // ----------------------------------------------------------- Fee structures

    public function test_admin_can_create_structure_with_items(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $tuition = $this->makeHead($school, 'Tuition Fee');

        $response = $this->actingAs($admin)->postJson('/api/v1/fee-structures', [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'name' => 'Class 5 Plan',
            'items' => [
                ['fee_head_id' => $tuition->id, 'amount' => 2000, 'frequency' => 'monthly'],
            ],
        ]);

        $response->assertCreated();
        $this->assertDatabaseCount('fee_structure_items', 1);
        $this->assertNotNull(AuditLog::where('action', 'fee_structure.created')->first());
    }

    public function test_structure_update_replaces_items(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $tuition = $this->makeHead($school, 'Tuition Fee');
        $transport = $this->makeHead($school, 'Transport Fee');
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $tuition, 'amount' => 2000, 'frequency' => 'monthly'],
        ]);

        $this->actingAs($admin)->putJson("/api/v1/fee-structures/{$structure->id}", [
            'academic_session_id' => $setup['session']->id,
            'class_id' => $setup['class']->id,
            'name' => 'Class 5 Plan',
            'items' => [
                ['fee_head_id' => $tuition->id, 'amount' => 2500, 'frequency' => 'monthly'],
                ['fee_head_id' => $transport->id, 'amount' => 1000, 'frequency' => 'monthly'],
            ],
        ])->assertOk();

        $this->assertDatabaseCount('fee_structure_items', 2);
        $this->assertDatabaseHas('fee_structure_items', ['fee_head_id' => $tuition->id, 'amount' => 2500.00]);
    }

    // ------------------------------------------------ Assignment + generation

    public function test_assign_generates_one_invoice_per_month_for_monthly_fee(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $this->makeHead($school, 'Tuition Fee'), 'amount' => 2000, 'frequency' => 'monthly'],
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])
            ->assertCreated();

        $this->assertSame(12, FeeInvoice::where('student_id', $student->id)->count());
    }

    public function test_assign_generates_expected_counts_per_frequency(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);

        $cases = [
            'quarterly' => 4,
            'half_yearly' => 2,
            'annual' => 1,
            'one_time' => 1,
        ];

        foreach ($cases as $frequency => $expected) {
            $student = $this->makeStudent($school, $setup, ['admission_no' => "ADM-{$frequency}"]);
            $structure = $this->makeStructure($school, $setup, [
                ['head' => $this->makeHead($school, "Fee {$frequency}"), 'amount' => 1000, 'frequency' => $frequency],
            ], "Plan {$frequency}");

            $this->actingAs($admin)
                ->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])
                ->assertCreated();

            $this->assertSame(
                $expected,
                FeeInvoice::where('student_id', $student->id)->count(),
                "Frequency {$frequency} should generate {$expected} invoices."
            );
        }
    }

    public function test_optional_items_are_not_billed(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $this->makeHead($school, 'Sports Fee', true), 'amount' => 1200, 'frequency' => 'annual', 'optional' => true],
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])
            ->assertCreated();

        $this->assertSame(0, FeeInvoice::where('student_id', $student->id)->count());
    }

    public function test_percent_discount_lowers_net_and_invoice_total(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $this->makeHead($school, 'Tuition Fee'), 'amount' => 1000, 'frequency' => 'one_time'],
        ]);

        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", [
            'fee_structure_id' => $structure->id,
            'discount_type' => 'percent',
            'discount_value' => 10,
            'discount_reason' => 'Sibling concession',
        ])->assertCreated();

        $item = StudentFeeItem::first();
        $this->assertEquals(900.0, $item->net_amount);
        $this->assertEquals(900.0, (float) FeeInvoice::where('student_id', $student->id)->first()->total_amount);
    }

    public function test_custom_line_is_added_and_billed(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $this->makeHead($school, 'Tuition Fee'), 'amount' => 1000, 'frequency' => 'one_time'],
        ]);

        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", [
            'fee_structure_id' => $structure->id,
            'custom_items' => [
                ['label' => 'Excursion Trip', 'amount' => 2000, 'frequency' => 'one_time'],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('student_fee_items', ['label' => 'Excursion Trip', 'is_custom' => true]);
        // Both the tuition (1000) and the custom trip (2000) land in the first invoice.
        $invoice = FeeInvoice::where('student_id', $student->id)->first();
        $this->assertEquals(3000.0, (float) $invoice->total_amount);
    }

    public function test_reassigning_cancels_previous_plan(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $head = $this->makeHead($school, 'Tuition Fee');
        $structureA = $this->makeStructure($school, $setup, [['head' => $head, 'amount' => 1000, 'frequency' => 'one_time']], 'Plan A');
        $structureB = $this->makeStructure($school, $setup, [['head' => $head, 'amount' => 2000, 'frequency' => 'one_time']], 'Plan B');

        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structureA->id])->assertCreated();
        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structureB->id])->assertCreated();

        $this->assertSame(1, StudentFeeAssignment::where('student_id', $student->id)->where('status', 'active')->count());
        $this->assertSame(1, StudentFeeAssignment::where('student_id', $student->id)->where('status', 'cancelled')->count());
        // Previous (unpaid) plan's invoices were removed; only Plan B's remain.
        $this->assertSame(1, FeeInvoice::where('student_id', $student->id)->count());
        $this->assertEquals(2000.0, (float) FeeInvoice::where('student_id', $student->id)->first()->total_amount);
    }

    // -------------------------------------------------------------- Payments

    private function assignSingleInvoice(School $school, User $admin, array $setup, int $amount = 1000): FeeInvoice
    {
        $student = $this->makeStudent($school, $setup, ['admission_no' => 'ADM-'.random_int(10000, 99999)]);
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $this->makeHead($school, 'Tuition '.random_int(1, 99999)), 'amount' => $amount, 'frequency' => 'one_time'],
        ], 'Plan '.random_int(1, 99999));

        $this->actingAs($admin)
            ->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])
            ->assertCreated();

        return FeeInvoice::where('student_id', $student->id)->firstOrFail();
    }

    public function test_partial_then_full_payment_updates_status_and_balance(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $invoice = $this->assignSingleInvoice($school, $admin, $setup, 1000);

        $first = $this->actingAs($admin)->postJson('/api/v1/fee-payments', [
            'fee_invoice_id' => $invoice->id,
            'amount' => 400,
            'mode' => 'cash',
        ]);
        $first->assertCreated();
        $first->assertJsonPath('data.receipt_no', 'RCP-'.$school->id.'-00001');

        $invoice->refresh();
        $this->assertSame('partial', $invoice->status);
        $this->assertEquals(600.0, $invoice->balance);

        $second = $this->actingAs($admin)->postJson('/api/v1/fee-payments', [
            'fee_invoice_id' => $invoice->id,
            'amount' => 600,
            'mode' => 'upi',
        ]);
        $second->assertCreated();
        $second->assertJsonPath('data.receipt_no', 'RCP-'.$school->id.'-00002');

        $invoice->refresh();
        $this->assertSame('paid', $invoice->status);
        $this->assertEquals(0.0, $invoice->balance);
    }

    public function test_overpayment_is_rejected(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $invoice = $this->assignSingleInvoice($school, $admin, $setup, 1000);

        $this->actingAs($admin)->postJson('/api/v1/fee-payments', [
            'fee_invoice_id' => $invoice->id,
            'amount' => 2000,
            'mode' => 'cash',
        ])->assertStatus(422);
    }

    public function test_voiding_payment_restores_invoice(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $invoice = $this->assignSingleInvoice($school, $admin, $setup, 1000);

        $payment = $this->actingAs($admin)->postJson('/api/v1/fee-payments', [
            'fee_invoice_id' => $invoice->id,
            'amount' => 1000,
            'mode' => 'cash',
        ])->json('data');

        $invoice->refresh();
        $this->assertSame('paid', $invoice->status);

        $this->actingAs($admin)->postJson("/api/v1/fee-payments/{$payment['id']}/void")->assertOk();

        $invoice->refresh();
        $this->assertSame('pending', $invoice->status);
        $this->assertEquals(0.0, (float) $invoice->paid_amount);
        $this->assertDatabaseHas('fee_payments', ['id' => $payment['id'], 'status' => 'cancelled']);
    }

    public function test_teacher_cannot_collect_payment(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $teacher = $this->makeUser($school, 'teacher');
        $setup = $this->makeSetup($school);
        $invoice = $this->assignSingleInvoice($school, $admin, $setup, 1000);

        $this->actingAs($teacher)->postJson('/api/v1/fee-payments', [
            'fee_invoice_id' => $invoice->id,
            'amount' => 500,
            'mode' => 'cash',
        ])->assertStatus(403);
    }

    public function test_editing_items_preserves_paid_invoices_and_rebuilds_unpaid(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $tuition = $this->makeHead($school, 'Tuition Fee');
        $transport = $this->makeHead($school, 'Transport Fee');
        $structure = $this->makeStructure($school, $setup, [['head' => $tuition, 'amount' => 1000, 'frequency' => 'monthly']]);

        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])->assertCreated();

        // Pay the earliest (month 0) invoice in full.
        $firstInvoice = FeeInvoice::where('student_id', $student->id)->orderBy('due_date')->first();
        $this->actingAs($admin)->postJson('/api/v1/fee-payments', ['fee_invoice_id' => $firstInvoice->id, 'amount' => 1000, 'mode' => 'cash'])->assertCreated();

        // Mid-year edit: add a monthly transport fee on top of tuition.
        $this->actingAs($admin)->putJson("/api/v1/fees/students/{$student->id}/items", [
            'items' => [
                ['fee_head_id' => $tuition->id, 'label' => 'Tuition Fee', 'base_amount' => 1000, 'frequency' => 'monthly'],
                ['fee_head_id' => $transport->id, 'label' => 'Transport Fee', 'base_amount' => 500, 'frequency' => 'monthly'],
            ],
        ])->assertOk();

        // Still 12 invoices: the paid month preserved + 11 rebuilt.
        $this->assertSame(12, FeeInvoice::where('student_id', $student->id)->count());

        // The paid invoice is untouched (still 1000, still paid).
        $firstInvoice->refresh();
        $this->assertSame('paid', $firstInvoice->status);
        $this->assertEquals(1000.0, (float) $firstInvoice->total_amount);

        // A later (unpaid) invoice now reflects tuition + transport = 1500.
        $laterInvoice = FeeInvoice::where('student_id', $student->id)
            ->where('id', '!=', $firstInvoice->id)
            ->orderBy('due_date')
            ->first();
        $this->assertEquals(1500.0, (float) $laterInvoice->total_amount);
    }

    public function test_adding_one_time_fee_after_payment_anchors_to_first_open_month(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $tuition = $this->makeHead($school, 'Tuition Fee');
        $structure = $this->makeStructure($school, $setup, [['head' => $tuition, 'amount' => 1000, 'frequency' => 'monthly']]);

        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])->assertCreated();
        $firstInvoice = FeeInvoice::where('student_id', $student->id)->orderBy('due_date')->first();
        $this->actingAs($admin)->postJson('/api/v1/fee-payments', ['fee_invoice_id' => $firstInvoice->id, 'amount' => 1000, 'mode' => 'cash'])->assertCreated();

        // Add a one-time custom excursion fee mid-year.
        $this->actingAs($admin)->putJson("/api/v1/fees/students/{$student->id}/items", [
            'items' => [
                ['fee_head_id' => $tuition->id, 'label' => 'Tuition Fee', 'base_amount' => 1000, 'frequency' => 'monthly'],
                ['label' => 'Excursion Trip', 'base_amount' => 2000, 'frequency' => 'one_time', 'is_custom' => true],
            ],
        ])->assertOk();

        // The one-time fee lands on the first still-open invoice (not the paid month 0).
        $firstInvoice->refresh();
        $this->assertEquals(1000.0, (float) $firstInvoice->total_amount);

        $secondInvoice = FeeInvoice::where('student_id', $student->id)
            ->where('id', '!=', $firstInvoice->id)
            ->orderBy('due_date')
            ->first();
        $this->assertEquals(3000.0, (float) $secondInvoice->total_amount); // 1000 tuition + 2000 trip
    }

    public function test_editing_does_not_rebill_a_one_time_fee_already_paid(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $tuition = $this->makeHead($school, 'Tuition Fee');
        $admission = $this->makeHead($school, 'Admission Fee');
        $transport = $this->makeHead($school, 'Transport Fee');
        // Month 0 bundles monthly tuition (1000) + one-time admission (5000) = 6000.
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $tuition, 'amount' => 1000, 'frequency' => 'monthly'],
            ['head' => $admission, 'amount' => 5000, 'frequency' => 'one_time'],
        ]);

        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])->assertCreated();
        $firstInvoice = FeeInvoice::where('student_id', $student->id)->orderBy('due_date')->first();
        $this->assertEquals(6000.0, (float) $firstInvoice->total_amount);

        // Pay month 0 (includes the one-time admission) in full.
        $this->actingAs($admin)->postJson('/api/v1/fee-payments', ['fee_invoice_id' => $firstInvoice->id, 'amount' => 6000, 'mode' => 'cash'])->assertCreated();

        $billedBefore = (float) FeeInvoice::where('student_id', $student->id)->sum('total_amount');

        // Edit: keep tuition + admission, add a monthly transport fee.
        $this->actingAs($admin)->putJson("/api/v1/fees/students/{$student->id}/items", [
            'items' => [
                ['fee_head_id' => $tuition->id, 'label' => 'Tuition Fee', 'base_amount' => 1000, 'frequency' => 'monthly'],
                ['fee_head_id' => $admission->id, 'label' => 'Admission Fee', 'base_amount' => 5000, 'frequency' => 'one_time'],
                ['fee_head_id' => $transport->id, 'label' => 'Transport Fee', 'base_amount' => 500, 'frequency' => 'monthly'],
            ],
        ])->assertOk();

        // Admission (already paid) is NOT re-billed; only transport on the 11 open months is added.
        $billedAfter = (float) FeeInvoice::where('student_id', $student->id)->sum('total_amount');
        $this->assertEquals($billedBefore + 500 * 11, $billedAfter);
        // The paid month 0 invoice is untouched.
        $firstInvoice->refresh();
        $this->assertEquals(6000.0, (float) $firstInvoice->total_amount);
        $this->assertSame('paid', $firstInvoice->status);
    }

    public function test_optional_fee_can_be_turned_on_for_a_student(): void
    {
        $school = $this->makeSchool();
        $admin = $this->makeUser($school, 'school_admin');
        $setup = $this->makeSetup($school);
        $student = $this->makeStudent($school, $setup);
        $tuition = $this->makeHead($school, 'Tuition Fee');
        $sports = $this->makeHead($school, 'Sports Fee', true);
        $structure = $this->makeStructure($school, $setup, [
            ['head' => $tuition, 'amount' => 1000, 'frequency' => 'one_time'],
            ['head' => $sports, 'amount' => 1200, 'frequency' => 'one_time', 'optional' => true],
        ]);

        $this->actingAs($admin)->postJson("/api/v1/fees/students/{$student->id}/assign", ['fee_structure_id' => $structure->id])->assertCreated();
        // Optional sports fee not billed yet → only tuition.
        $this->assertEquals(1000.0, (float) FeeInvoice::where('student_id', $student->id)->first()->total_amount);

        // Turn the optional sports fee on for this student (is_optional = false).
        $this->actingAs($admin)->putJson("/api/v1/fees/students/{$student->id}/items", [
            'items' => [
                ['fee_head_id' => $tuition->id, 'label' => 'Tuition Fee', 'base_amount' => 1000, 'frequency' => 'one_time'],
                ['fee_head_id' => $sports->id, 'label' => 'Sports Fee', 'base_amount' => 1200, 'frequency' => 'one_time', 'is_optional' => false],
            ],
        ])->assertOk();

        $this->assertEquals(2200.0, (float) FeeInvoice::where('student_id', $student->id)->first()->total_amount);
    }

    // ------------------------------------------------------------- Tenancy

    public function test_collections_roster_is_tenant_scoped(): void
    {
        $schoolA = $this->makeSchool('AAA');
        $schoolB = $this->makeSchool('BBB');
        $adminA = $this->makeUser($schoolA, 'school_admin');
        $setupA = $this->makeSetup($schoolA);
        $setupB = $this->makeSetup($schoolB);

        $this->makeStudent($schoolA, $setupA, ['admission_no' => 'A-1']);
        $this->makeStudent($schoolA, $setupA, ['admission_no' => 'A-2']);
        $this->makeStudent($schoolB, $setupB, ['admission_no' => 'B-1']);

        $response = $this->actingAs($adminA)->getJson('/api/v1/fees/students');
        $response->assertOk();
        $response->assertJsonPath('data.meta.total', 2);
    }

    public function test_cannot_pay_invoice_from_another_school(): void
    {
        $schoolA = $this->makeSchool('AAA');
        $schoolB = $this->makeSchool('BBB');
        $adminA = $this->makeUser($schoolA, 'school_admin');
        $adminB = $this->makeUser($schoolB, 'school_admin');
        $setupB = $this->makeSetup($schoolB);
        $invoiceB = $this->assignSingleInvoice($schoolB, $adminB, $setupB, 1000);

        // Admin A must not be able to pay school B's invoice.
        $this->actingAs($adminA)->postJson('/api/v1/fee-payments', [
            'fee_invoice_id' => $invoiceB->id,
            'amount' => 500,
            'mode' => 'cash',
        ])->assertStatus(422);
    }
}
