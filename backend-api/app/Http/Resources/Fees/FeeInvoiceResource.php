<?php

namespace App\Http\Resources\Fees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeInvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'student_fee_assignment_id' => $this->student_fee_assignment_id,
            'invoice_no' => $this->invoice_no,
            'period_label' => $this->period_label,
            'due_date' => $this->due_date?->toDateString(),
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'balance' => $this->balance,
            'status' => $this->status,
            'is_overdue' => $this->is_overdue,
            'items' => FeeInvoiceItemResource::collection($this->whenLoaded('items')),
            'payments' => FeePaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
