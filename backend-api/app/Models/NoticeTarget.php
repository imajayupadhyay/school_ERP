<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoticeTarget extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'notice_id',
        'target_type',
        'target_id',
        'target_value',
        'target_label',
    ];

    /** @return BelongsTo<Notice, $this> */
    public function notice(): BelongsTo
    {
        return $this->belongsTo(Notice::class);
    }
}
