<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes immutable audit log entries. Reusable across modules: callers
 * compute the before/after diff and pass it here.
 */
class AuditLogger
{
    /**
     * @param  array<string, array{old: mixed, new: mixed}>  $changes
     */
    public function log(
        ?School $school,
        ?User $user,
        string $action,
        array $changes = [],
        ?Model $auditable = null,
        ?string $ipAddress = null,
    ): AuditLog {
        return AuditLog::create([
            'school_id' => $school?->id,
            'user_id' => $user?->id,
            'action' => $action,
            'auditable_type' => $auditable ? $auditable->getMorphClass() : null,
            'auditable_id' => $auditable?->getKey(),
            'changes' => $changes,
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }

    /**
     * Build a {field: {old, new}} diff for the given fillable fields that changed.
     *
     * @param  array<string, mixed>  $original
     * @param  array<string, mixed>  $updated
     * @return array<string, array{old: mixed, new: mixed}>
     */
    public function diff(array $original, array $updated): array
    {
        $changes = [];

        foreach ($updated as $field => $newValue) {
            $oldValue = $original[$field] ?? null;

            if ($oldValue !== $newValue) {
                $changes[$field] = ['old' => $oldValue, 'new' => $newValue];
            }
        }

        return $changes;
    }
}
