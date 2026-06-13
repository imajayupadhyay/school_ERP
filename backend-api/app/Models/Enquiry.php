<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A sales lead from the public enquiry form. Platform-level (not tenant
 * scoped) — these prospects exist before any school is created.
 */
class Enquiry extends Model
{
    public const STATUSES = ['new', 'contacted', 'converted', 'closed'];

    protected $fillable = [
        'name',
        'email',
        'phone',
        'status',
        'note',
        'ip_address',
    ];
}
