<?php

namespace App\Services\Platform;

use App\Models\School;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Permanently deletes a school tenant and EVERY record that belongs to it.
 *
 * Robustness / safety design:
 * - Tenant tables are auto-discovered by the presence of a `school_id`
 *   column (scoped to the current database), so a future module that adds a
 *   tenant table is cleaned automatically and nothing is missed.
 * - Every delete is filtered by the exact `school_id`, so no other school's
 *   data is ever touched. The platform super admin (school_id = null) and
 *   their access token are never deleted.
 * - The two tenant-related tables without a `school_id` column
 *   (`role_permissions`, `personal_access_tokens`) are purged via their
 *   parent ids (the school's roles / users).
 * - The whole purge runs inside a transaction with foreign-key constraints
 *   disabled (driver-agnostic), so ordering never causes a failure and a
 *   partial delete can never be committed.
 */
class SchoolDeletionService
{
    /** Tables that hold tenant data but have no `school_id` column. */
    private const PARENT_SCOPED_TABLES = ['role_permissions', 'personal_access_tokens'];

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function delete(School $school, ?User $actor, ?string $ip): void
    {
        $schoolId = $school->id;
        $snapshot = ['name' => $school->name, 'code' => $school->code];

        $userIds = DB::table('users')->where('school_id', $schoolId)->pluck('id')->all();
        $roleIds = DB::table('roles')->where('school_id', $schoolId)->pluck('id')->all();
        $tenantTables = $this->tenantTables();
        $userMorph = (new User)->getMorphClass();

        Schema::withoutForeignKeyConstraints(function () use ($schoolId, $userIds, $roleIds, $tenantTables, $userMorph) {
            DB::transaction(function () use ($schoolId, $userIds, $roleIds, $tenantTables, $userMorph) {
                // Child/pivot tables that don't carry school_id directly.
                if ($roleIds !== []) {
                    DB::table('role_permissions')->whereIn('role_id', $roleIds)->delete();
                }
                if ($userIds !== []) {
                    DB::table('personal_access_tokens')
                        ->where('tokenable_type', $userMorph)
                        ->whereIn('tokenable_id', $userIds)
                        ->delete();
                }

                // Every tenant-scoped table, filtered by this school only.
                foreach ($tenantTables as $table) {
                    DB::table($table)->where('school_id', $schoolId)->delete();
                }

                // Finally the tenant root.
                DB::table('schools')->where('id', $schoolId)->delete();
            });
        });

        // Platform-level audit (school_id = null) so the record survives the purge.
        $this->auditLogger->log(
            school: null,
            user: $actor,
            action: 'school.deleted',
            changes: [
                'name' => ['old' => $snapshot['name'], 'new' => null],
                'code' => ['old' => $snapshot['code'], 'new' => null],
            ],
            ipAddress: $ip,
        );
    }

    /**
     * All tables in the current database that carry a `school_id` column.
     *
     * @return array<int, string>
     */
    private function tenantTables(): array
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $names = collect(DB::select("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"))
                ->pluck('name');
        } else {
            $database = DB::connection()->getDatabaseName();
            $names = collect(DB::select(
                'SELECT TABLE_NAME as name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',
                [$database, 'BASE TABLE'],
            ))->pluck('name');
        }

        return $names
            ->reject(fn (string $name) => in_array($name, self::PARENT_SCOPED_TABLES, true))
            ->filter(fn (string $name) => in_array('school_id', Schema::getColumnListing($name), true))
            ->values()
            ->all();
    }
}
