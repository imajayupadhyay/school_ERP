<?php

namespace App\Services\Fees;

use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\Student;
use App\Models\StudentFeeAssignment;
use App\Models\StudentFeeItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns assigning a fee structure to a student. Snapshots the structure's items
 * onto the student (so later structure edits never change an assigned student's
 * dues), applies optional discounts / custom lines, then generates invoices.
 */
class FeeAssignmentService
{
    public function __construct(
        private readonly InvoiceGeneratorService $generator,
    ) {
    }

    /**
     * @param  array<string, mixed>  $options  discount_type, discount_value, discount_reason, notes, custom_items[]
     */
    public function assignStructure(Student $student, FeeStructure $structure, array $options = []): StudentFeeAssignment
    {
        return DB::transaction(function () use ($student, $structure, $options) {
            $structure->loadMissing('items.feeHead');
            $this->cancelActiveForSession($student, $structure->academic_session_id);

            $assignment = StudentFeeAssignment::create([
                'school_id' => $student->school_id,
                'student_id' => $student->id,
                'academic_session_id' => $structure->academic_session_id,
                'fee_structure_id' => $structure->id,
                'status' => 'active',
                'notes' => $options['notes'] ?? null,
            ]);

            $discountType = $options['discount_type'] ?? 'none';
            $discountValue = $discountType === 'none' ? 0 : (float) ($options['discount_value'] ?? 0);
            $discountReason = $discountType === 'none' ? null : ($options['discount_reason'] ?? null);

            foreach ($structure->items as $item) {
                StudentFeeItem::create([
                    'school_id' => $student->school_id,
                    'student_fee_assignment_id' => $assignment->id,
                    'fee_head_id' => $item->fee_head_id,
                    'label' => $item->feeHead?->name ?? 'Fee',
                    'base_amount' => $item->amount,
                    'frequency' => $item->frequency,
                    'discount_type' => $discountType,
                    'discount_value' => $discountValue,
                    'discount_reason' => $discountReason,
                    'is_custom' => false,
                    'is_optional' => $item->is_optional,
                ]);
            }

            foreach ($options['custom_items'] ?? [] as $custom) {
                $this->createItem($assignment, $custom, true);
            }

            $assignment->load('items');
            $this->generator->generate($assignment);

            return $assignment->fresh(['items', 'invoices.items']);
        });
    }

    /**
     * Replace a plan's fee items and regenerate invoices. Payment-safe: the
     * generator preserves invoices that already have collected money and
     * rebuilds only the still-open months, so an admin can add optional/custom
     * fees or adjust discounts for a student at any point — even mid-year.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    public function updateItems(StudentFeeAssignment $assignment, array $items): StudentFeeAssignment
    {
        return DB::transaction(function () use ($assignment, $items) {
            $assignment->items()->delete();

            foreach ($items as $item) {
                $this->createItem($assignment, $item, (bool) ($item['is_custom'] ?? false));
            }

            $assignment->load('items');
            $this->generator->generate($assignment);

            return $assignment->fresh(['items', 'invoices.items']);
        });
    }

    /**
     * Cancel a plan: keep history but cancel the plan and its unpaid invoices.
     */
    public function cancel(StudentFeeAssignment $assignment): StudentFeeAssignment
    {
        return DB::transaction(function () use ($assignment) {
            $assignment->invoices()
                ->where('status', '!=', 'paid')
                ->update(['status' => 'cancelled']);

            $assignment->update(['status' => 'cancelled']);

            return $assignment->fresh(['items', 'invoices.items']);
        });
    }

    private function cancelActiveForSession(Student $student, int $sessionId): void
    {
        $existing = StudentFeeAssignment::forSchool($student->school_id)
            ->where('student_id', $student->id)
            ->where('academic_session_id', $sessionId)
            ->where('status', 'active')
            ->get();

        foreach ($existing as $assignment) {
            $this->guardAgainstPaidInvoices(
                $assignment,
                'This student already has a fee plan with recorded payments for this session. Void the payments before reassigning.',
                'fee_structure_id',
            );

            $this->wipeInvoices($assignment);
            $assignment->items()->delete();
            $assignment->update(['status' => 'cancelled']);
        }
    }

    private function guardAgainstPaidInvoices(StudentFeeAssignment $assignment, string $message, string $field): void
    {
        $hasPayments = FeePayment::forSchool($assignment->school_id)
            ->where('status', 'completed')
            ->whereIn('fee_invoice_id', $assignment->invoices()->pluck('id'))
            ->exists();

        if ($hasPayments) {
            throw ValidationException::withMessages([$field => $message]);
        }
    }

    private function wipeInvoices(StudentFeeAssignment $assignment): void
    {
        $assignment->invoices->each(fn ($invoice) => $invoice->items()->delete());
        $assignment->invoices()->delete();
        $assignment->load('invoices');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createItem(StudentFeeAssignment $assignment, array $data, bool $isCustom): void
    {
        $discountType = $data['discount_type'] ?? 'none';

        StudentFeeItem::create([
            'school_id' => $assignment->school_id,
            'student_fee_assignment_id' => $assignment->id,
            'fee_head_id' => $data['fee_head_id'] ?? null,
            'label' => $data['label'],
            'base_amount' => $data['base_amount'] ?? $data['amount'] ?? 0,
            'frequency' => $data['frequency'] ?? 'one_time',
            'discount_type' => $discountType,
            'discount_value' => $discountType === 'none' ? 0 : (float) ($data['discount_value'] ?? 0),
            'discount_reason' => $discountType === 'none' ? null : ($data['discount_reason'] ?? null),
            'is_custom' => $isCustom,
            'is_optional' => (bool) ($data['is_optional'] ?? false),
        ]);
    }
}
