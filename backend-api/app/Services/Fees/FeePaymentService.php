<?php

namespace App\Services\Fees;

use App\Models\FeeInvoice;
use App\Models\FeePayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Records and voids fee payments, allocating each payment to an invoice and
 * keeping the invoice's paid_amount / status in sync. Supports partial
 * payments and assigns a sequential receipt number per school.
 */
class FeePaymentService
{
    /**
     * @param  array<string, mixed>  $data  amount, mode, reference_no, paid_on, remarks
     */
    public function record(FeeInvoice $invoice, array $data, User $user): FeePayment
    {
        return DB::transaction(function () use ($invoice, $data, $user) {
            $payment = FeePayment::create([
                'school_id' => $invoice->school_id,
                'student_id' => $invoice->student_id,
                'fee_invoice_id' => $invoice->id,
                'receipt_no' => $this->nextReceiptNo($invoice->school_id),
                'amount' => round((float) $data['amount'], 2),
                'mode' => $data['mode'] ?? 'cash',
                'reference_no' => $data['reference_no'] ?? null,
                'paid_on' => $data['paid_on'] ?? now()->toDateString(),
                'collected_by' => $user->id,
                'remarks' => $data['remarks'] ?? null,
                'status' => 'completed',
            ]);

            $this->recalculateInvoice($invoice);

            return $payment;
        });
    }

    public function void(FeePayment $payment): FeePayment
    {
        return DB::transaction(function () use ($payment) {
            if ($payment->status === 'cancelled') {
                return $payment;
            }

            $payment->update(['status' => 'cancelled']);
            $payment->loadMissing('invoice');

            if ($payment->invoice !== null) {
                $this->recalculateInvoice($payment->invoice);
            }

            return $payment->fresh(['invoice']);
        });
    }

    public function recalculateInvoice(FeeInvoice $invoice): void
    {
        $paid = round((float) FeePayment::forSchool($invoice->school_id)
            ->where('fee_invoice_id', $invoice->id)
            ->where('status', 'completed')
            ->sum('amount'), 2);

        // Never resurrect a cancelled invoice; just keep its paid figure accurate.
        if ($invoice->status === 'cancelled') {
            $invoice->update(['paid_amount' => $paid]);

            return;
        }

        $total = (float) $invoice->total_amount;
        $status = match (true) {
            $paid <= 0 => 'pending',
            $paid + 0.001 >= $total => 'paid',
            default => 'partial',
        };

        $invoice->update(['paid_amount' => $paid, 'status' => $status]);
    }

    private function nextReceiptNo(int $schoolId): string
    {
        $last = FeePayment::forSchool($schoolId)->orderByDesc('id')->value('receipt_no');
        $seq = 0;

        if ($last !== null && preg_match('/(\d+)$/', $last, $matches)) {
            $seq = (int) $matches[1];
        }

        return sprintf('RCP-%d-%05d', $schoolId, $seq + 1);
    }
}
