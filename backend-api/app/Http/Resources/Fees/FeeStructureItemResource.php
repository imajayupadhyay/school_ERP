<?php

namespace App\Http\Resources\Fees;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeStructureItemResource extends JsonResource
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
            'amount' => (float) $this->amount,
            'frequency' => $this->frequency,
            'is_optional' => (bool) $this->is_optional,
        ];
    }
}
