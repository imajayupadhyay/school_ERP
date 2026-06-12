<?php

namespace App\Http\Controllers\Api\V1\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeePaymentRequest;
use App\Http\Resources\Fees\FeePaymentResource;
use App\Models\FeeInvoice;
use App\Models\FeePayment;
use App\Services\Fees\FeePaymentService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeePaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly FeePaymentService $paymentService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));

        $payments = FeePayment::query()
            ->with(['collector', 'invoice', 'student'])
            ->when($search !== '', fn ($query) => $query->where(function ($inner) use ($search) {
                $inner->where('receipt_no', 'like', "%{$search}%")
                    ->orWhere('reference_no', 'like', "%{$search}%");
            }))
            ->when($request->filled('student_id'), fn ($query) => $query->where('student_id', $request->integer('student_id')))
            ->when($request->filled('mode'), fn ($query) => $query->where('mode', $request->query('mode')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->when($request->filled('from'), fn ($query) => $query->whereDate('paid_on', '>=', $request->query('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('paid_on', '<=', $request->query('to')))
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => FeePaymentResource::collection($payments->getCollection()),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'from' => $payments->firstItem(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'to' => $payments->lastItem(),
                'total' => $payments->total(),
            ],
        ]);
    }

    public function store(FeePaymentRequest $request): JsonResponse
    {
        $invoice = FeeInvoice::forSchool($request->user()->school_id)
            ->findOrFail($request->validated('fee_invoice_id'));

        $payment = $this->paymentService->record($invoice, $request->validated(), $request->user());

        $this->auditLogger->log(
            school: $invoice->school,
            user: $request->user(),
            action: 'fee_payment.collected',
            changes: [
                'receipt_no' => $payment->receipt_no,
                'invoice_no' => $invoice->invoice_no,
                'amount' => (float) $payment->amount,
                'mode' => $payment->mode,
            ],
            auditable: $payment,
            ipAddress: $request->ip(),
        );

        return $this->created(
            new FeePaymentResource($payment->load(['collector', 'invoice'])),
            "Payment recorded. Receipt {$payment->receipt_no}.",
        );
    }

    public function show(FeePayment $feePayment): JsonResponse
    {
        return $this->ok(new FeePaymentResource($feePayment->load(['collector', 'invoice', 'student'])));
    }

    public function void(Request $request, FeePayment $feePayment): JsonResponse
    {
        $user = $request->user();

        if ($feePayment->status === 'cancelled') {
            return $this->fail('This payment is already cancelled.', 422);
        }

        $this->paymentService->void($feePayment);

        $this->auditLogger->log(
            school: $feePayment->school,
            user: $user,
            action: 'fee_payment.voided',
            changes: ['receipt_no' => $feePayment->receipt_no, 'amount' => (float) $feePayment->amount],
            auditable: $feePayment,
            ipAddress: $request->ip(),
        );

        return $this->ok(new FeePaymentResource($feePayment->fresh(['collector', 'invoice'])), 'Payment voided.');
    }
}
