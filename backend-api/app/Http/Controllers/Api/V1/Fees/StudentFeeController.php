<?php

namespace App\Http\Controllers\Api\V1\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\StudentFeeAssignRequest;
use App\Http\Requests\Fees\StudentFeeItemsRequest;
use App\Http\Resources\Fees\FeeInvoiceResource;
use App\Http\Resources\Fees\StudentFeeItemResource;
use App\Models\FeeStructure;
use App\Models\Student;
use App\Models\StudentFeeAssignment;
use App\Services\Fees\FeeAssignmentService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentFeeController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly FeeAssignmentService $assignmentService,
    ) {
    }

    public function show(Student $student): JsonResponse
    {
        return $this->ok($this->planPayload($student));
    }

    public function assign(StudentFeeAssignRequest $request, Student $student): JsonResponse
    {
        $structure = FeeStructure::forSchool($student->school_id)
            ->findOrFail($request->validated('fee_structure_id'));

        $assignment = $this->assignmentService->assignStructure($student, $structure, $request->validated());

        $this->auditLogger->log(
            school: $student->school,
            user: $request->user(),
            action: 'student_fee.assigned',
            changes: [
                'fee_structure_id' => $structure->id,
                'fee_structure' => $structure->name,
                'discount_type' => $request->validated('discount_type'),
                'discount_value' => $request->validated('discount_value'),
            ],
            auditable: $assignment,
            ipAddress: $request->ip(),
        );

        return $this->created($this->planPayload($student), 'Fee plan assigned.');
    }

    public function updateItems(StudentFeeItemsRequest $request, Student $student): JsonResponse
    {
        $assignment = $this->activeAssignment($student);

        if ($assignment === null) {
            return $this->fail('This student does not have an active fee plan to edit.', 422);
        }

        $this->assignmentService->updateItems($assignment, $request->validated('items'));

        $this->auditLogger->log(
            school: $student->school,
            user: $request->user(),
            action: 'student_fee.items_updated',
            changes: ['items' => ['new' => $request->validated('items')]],
            auditable: $assignment,
            ipAddress: $request->ip(),
        );

        return $this->ok($this->planPayload($student), 'Fee plan updated.');
    }

    public function cancel(Request $request, Student $student): JsonResponse
    {
        $user = $request->user();

        $assignment = $this->activeAssignment($student);

        if ($assignment === null) {
            return $this->fail('This student does not have an active fee plan.', 422);
        }

        $this->assignmentService->cancel($assignment);

        $this->auditLogger->log(
            school: $student->school,
            user: $user,
            action: 'student_fee.cancelled',
            changes: ['student_fee_assignment_id' => $assignment->id],
            auditable: $assignment,
            ipAddress: $request->ip(),
        );

        return $this->ok($this->planPayload($student), 'Fee plan cancelled.');
    }

    private function activeAssignment(Student $student): ?StudentFeeAssignment
    {
        return StudentFeeAssignment::query()
            ->where('student_id', $student->id)
            ->where('status', 'active')
            ->latest('id')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function planPayload(Student $student): array
    {
        $assignment = StudentFeeAssignment::query()
            ->where('student_id', $student->id)
            ->where('status', 'active')
            ->with(['items.feeHead', 'feeStructure', 'academicSession'])
            ->latest('id')
            ->first();

        $invoices = $student->feeInvoices()
            ->where('status', '!=', 'cancelled')
            ->with(['items', 'payments' => fn ($query) => $query->where('status', 'completed')])
            ->orderBy('due_date')
            ->get();

        $totalBilled = round((float) $invoices->sum('total_amount'), 2);
        $totalPaid = round((float) $invoices->sum('paid_amount'), 2);

        return [
            'student' => [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'full_name' => $student->full_name,
                'class_name' => $student->class_name,
                'section' => $student->section,
                'class_id' => $student->class_id,
                'academic_session_id' => $student->academic_session_id,
            ],
            'assignment' => $assignment ? [
                'id' => $assignment->id,
                'status' => $assignment->status,
                'notes' => $assignment->notes,
                'fee_structure' => $assignment->feeStructure ? [
                    'id' => $assignment->feeStructure->id,
                    'name' => $assignment->feeStructure->name,
                ] : null,
                'academic_session' => $assignment->academicSession ? [
                    'id' => $assignment->academicSession->id,
                    'name' => $assignment->academicSession->name,
                ] : null,
                'items' => StudentFeeItemResource::collection($assignment->items),
            ] : null,
            'invoices' => FeeInvoiceResource::collection($invoices),
            'summary' => [
                'total_billed' => $totalBilled,
                'total_paid' => $totalPaid,
                'outstanding' => round($totalBilled - $totalPaid, 2),
                'overdue_count' => $invoices->filter(fn ($invoice) => $invoice->is_overdue)->count(),
                'invoice_count' => $invoices->count(),
            ],
        ];
    }
}
