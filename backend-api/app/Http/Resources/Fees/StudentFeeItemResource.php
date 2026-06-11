<?php

namespace App\Http\Resources\Fees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentFeeItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fee_head_id' => $this->fee_head_id,
            'fee_head' => $this->whenLoaded('feeHead', fn () => $this->feeHead ? [
                'id' => $this->feeHead->id,
                'name' => $this->feeHead->name,
            ] : null),
            'label' => $this->label,
            'base_amount' => (float) $this->base_amount,
            'frequency' => $this->frequency,
            'discount_type' => $this->discount_type,
            'discount_value' => (float) $this->discount_value,
            'discount_reason' => $this->discount_reason,
            'net_amount' => $this->net_amount,
            'is_custom' => (bool) $this->is_custom,
            'is_optional' => (bool) $this->is_optional,
        ];
    }
}
