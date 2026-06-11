<?php

namespace App\Http\Resources\Fees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeInvoiceItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fee_head_id' => $this->fee_head_id,
            'label' => $this->label,
            'amount' => (float) $this->amount,
        ];
    }
}
