<?php

namespace App\Services\Platform;

use App\Models\Permission;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Services\Access\AccessProvisioner;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creates and lifecycle-manages school tenants from the platform panel.
 *
 * Creating a school is a single transaction: the school row, its default
 * RBAC roles (via AccessProvisioner), and the first owner admin account are
 * all created together so a tenant is never left half-provisioned.
 */
class SchoolProvisioningService
{
    public function __construct(
        private readonly AccessProvisioner $accessProvisioner,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    /**
     * @param  array<string, mixed>  $schoolData   Validated school fields (excluding admin_*).
     * @param  array{name: string, email: string, phone?: ?string, password?: ?string}  $adminData
     * @return array{school: School, admin: User, temporary_password: ?string}
     */
    public function createSchool(array $schoolData, array $adminData, ?User $actor, ?string $ip): array
    {
        return DB::transaction(function () use ($schoolData, $adminData, $actor, $ip) {
            $schoolData['code'] = ! empty($schoolData['code'])
                ? $schoolData['code']
                : $this->generateCode($schoolData['name']);
            $schoolData['status'] = $schoolData['status'] ?? 'active';

            $school = School::create($schoolData);

            // Ensure the global permission catalog exists before provisioning roles.
            if (Permission::doesntExist()) {
                $this->accessProvisioner->syncCatalog();
            }
            $this->accessProvisioner->provisionSchool($school);

            $ownerRole = Role::withoutGlobalScope('school')
                ->where('school_id', $school->id)
                ->where('slug', 'school_admin')
                ->first();

            // Use the supplied password, or generate a temporary one to hand off.
            $generated = empty($adminData['password']);
            $password = $generated ? Str::password(12) : $adminData['password'];

            $admin = User::create([
                'school_id' => $school->id,
                'name' => $adminData['name'],
                'email' => $adminData['email'],
                'phone' => $adminData['phone'] ?? null,
                'role' => 'school_admin',
                'role_id' => $ownerRole?->id,
                'status' => 'active',
                'password' => $password,
            ]);

            $this->auditLogger->log(
                school: $school,
                user: $actor,
                action: 'school.created',
                changes: [
                    'name' => ['old' => null, 'new' => $school->name],
                    'code' => ['old' => null, 'new' => $school->code],
                    'status' => ['old' => null, 'new' => $school->status],
                    'admin_email' => ['old' => null, 'new' => $admin->email],
                ],
                auditable: $school,
                ipAddress: $ip,
            );

            return [
                'school' => $school,
                'admin' => $admin,
                'temporary_password' => $generated ? $password : null,
            ];
        });
    }

    /** Change a school's lifecycle status (active | inactive | suspended). */
    public function setStatus(School $school, string $status, ?User $actor, ?string $ip): School
    {
        $old = $school->status;

        if ($old === $status) {
            return $school;
        }

        $school->update(['status' => $status]);

        $this->auditLogger->log(
            school: $school,
            user: $actor,
            action: 'school.status_changed',
            changes: ['status' => ['old' => $old, 'new' => $status]],
            auditable: $school,
            ipAddress: $ip,
        );

        return $school;
    }

    /** Build a unique uppercase school code from the school name. */
    private function generateCode(string $name): string
    {
        $base = Str::upper(Str::of($name)->replaceMatches('/[^A-Za-z0-9]/', '')->substr(0, 8));

        if ($base === '') {
            $base = 'SCHOOL';
        }

        $code = $base;
        $i = 1;

        while (School::where('code', $code)->exists()) {
            $code = $base.$i;
            $i++;
        }

        return $code;
    }
}
