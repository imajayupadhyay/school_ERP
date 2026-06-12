<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Notice extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'created_by',
        'published_by',
        'title',
        'body',
        'category',
        'priority',
        'status',
        'publish_at',
        'published_at',
        'expires_at',
        'attachment_path',
    ];

    protected function casts(): array
    {
        return [
            'publish_at' => 'datetime',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<School, $this> */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    /** @return HasMany<NoticeTarget, $this> */
    public function targets(): HasMany
    {
        return $this->hasMany(NoticeTarget::class);
    }

    /** @return HasMany<NoticeRead, $this> */
    public function reads(): HasMany
    {
        return $this->hasMany(NoticeRead::class);
    }

    public function getDeliveryStatusAttribute(): string
    {
        if ($this->status === 'archived') {
            return 'archived';
        }

        if ($this->status === 'draft') {
            return 'draft';
        }

        if ($this->expires_at?->isPast()) {
            return 'expired';
        }

        if ($this->status === 'scheduled' && $this->publish_at?->isFuture()) {
            return 'scheduled';
        }

        return 'published';
    }
}
