<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class GuardianService
{
    private const GUARDIAN_FIELDS = [
        'name',
        'relation',
        'phone',
        'alternate_phone',
        'email',
        'occupation',
        'address',
        'status',
    ];

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function guardianPayload(array $validated, ?Guardian $guardian = null): array
    {
        $payload = collect($validated)->only(self::GUARDIAN_FIELDS)->all();
        $payload['status'] = $payload['status'] ?? $guardian?->status ?? 'active';

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $guardianPayload
     */
    public function upsertPortalUser(
        array $validated,
        array $guardianPayload,
        int $schoolId,
        ?Guardian $guardian = null,
    ): ?User {
        $portalEnabled = (bool) ($validated['portal_enabled'] ?? false);

        if (! $portalEnabled) {
            if ($guardian?->user !== null) {
                $guardian->user->update(['status' => 'inactive']);

                return $guardian->user;
            }

            return null;
        }

        $user = $guardian?->user;
        $portalEmail = $validated['portal_email'] ?? $guardianPayload['email'];

        $payload = [
            'school_id' => $schoolId,
            'name' => $guardianPayload['name'],
            'email' => $portalEmail,
            'phone' => $guardianPayload['phone'] ?? null,
            'role' => 'parent',
            'status' => $validated['portal_status'] ?? 'active',
        ];

        if (! empty($validated['portal_password'])) {
            $payload['password'] = Hash::make($validated['portal_password']);
        }

        if ($user === null) {
            $user = User::create($payload);
        } else {
            $user->update($payload);
        }

        return $user;
    }

    /**
     * @param  array<int, array<string, mixed>>  $studentRows
     */
    public function syncStudents(Guardian $guardian, array $studentRows): void
    {
        $sync = [];

        foreach ($studentRows as $row) {
            $studentId = (int) $row['student_id'];
            $isPrimary = (bool) ($row['is_primary'] ?? false);
            $isEmergencyContact = (bool) ($row['is_emergency_contact'] ?? $isPrimary);

            if ($isPrimary) {
                DB::table('guardian_student')
                    ->where('school_id', $guardian->school_id)
                    ->where('student_id', $studentId)
                    ->update(['is_primary' => false]);
            }

            $sync[$studentId] = [
                'school_id' => $guardian->school_id,
                'relationship' => $row['relationship'] ?? $guardian->relation,
                'is_primary' => $isPrimary,
                'is_emergency_contact' => $isEmergencyContact,
                'pickup_allowed' => (bool) ($row['pickup_allowed'] ?? true),
            ];
        }

        $guardian->students()->sync($sync);

        foreach ($studentRows as $row) {
            if (! (bool) ($row['is_primary'] ?? false)) {
                continue;
            }

            Student::forSchool($guardian->school_id)
                ->whereKey((int) $row['student_id'])
                ->update([
                    'guardian_name' => $guardian->name,
                    'guardian_phone' => $guardian->phone,
                    'emergency_contact_name' => $guardian->name,
                    'emergency_contact_relation' => $row['relationship'] ?? $guardian->relation,
                    'emergency_contact_phone' => $guardian->phone,
                ]);
        }
    }
}
