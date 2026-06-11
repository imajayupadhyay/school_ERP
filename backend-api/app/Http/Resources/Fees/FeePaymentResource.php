<?php

namespace App\Http\Resources\Fees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeePaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'fee_invoice_id' => $this->fee_invoice_id,
            'receipt_no' => $this->receipt_no,
            'amount' => (float) $this->amount,
            'mode' => $this->mode,
            'reference_no' => $this->reference_no,
            'paid_on' => $this->paid_on?->toDateString(),
            'remarks' => $this->remarks,
            'status' => $this->status,
            'collected_by' => $this->collected_by,
            'collector' => $this->whenLoaded('collector', fn () => $this->collector ? [
                'id' => $this->collector->id,
                'name' => $this->collector->name,
            ] : null),
            'invoice' => $this->whenLoaded('invoice', fn () => $this->invoice ? [
                'id' => $this->invoice->id,
                'invoice_no' => $this->invoice->invoice_no,
                'period_label' => $this->invoice->period_label,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
