<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeStructureItem extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'fee_structure_id',
        'fee_head_id',
        'amount',
        'frequency',
        'is_optional',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_optional' => 'boolean',
        ];
    }

    /** @return BelongsTo<FeeStructure, $this> */
    public function feeStructure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class);
    }

    /** @return BelongsTo<FeeHead, $this> */
    public function feeHead(): BelongsTo
    {
        return $this->belongsTo(FeeHead::class);
    }
}
