<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeInvoiceItem extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'fee_invoice_id',
        'fee_head_id',
        'label',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<FeeInvoice, $this> */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(FeeInvoice::class, 'fee_invoice_id');
    }

    /** @return BelongsTo<FeeHead, $this> */
    public function feeHead(): BelongsTo
    {
        return $this->belongsTo(FeeHead::class);
    }
}
