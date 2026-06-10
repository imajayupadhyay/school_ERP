<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StudentService
{
    private const STUDENT_FIELDS = [
        'academic_session_id',
        'admission_no',
        'admission_type',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'date_of_birth',
        'class_id',
        'section_id',
        'roll_no',
        'house',
        'category',
        'religion',
        'blood_group',
        'nationality',
        'mother_tongue',
        'primary_phone',
        'primary_email',
        'current_address',
        'permanent_address',
        'city',
        'state',
        'postal_code',
        'country',
        'guardian_name',
        'guardian_phone',
        'emergency_contact_name',
        'emergency_contact_relation',
        'emergency_contact_phone',
        'medical_conditions',
        'allergies',
        'medications',
        'doctor_name',
        'doctor_phone',
        'previous_school_name',
        'previous_school_board',
        'previous_school_class',
        'previous_school_transfer_certificate_no',
        'status',
        'admission_date',
        'transfer_date',
        'transfer_reason',
    ];

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function studentPayload(array $validated, int $schoolId, ?Student $student = null): array
    {
        $payload = collect($validated)->only(self::STUDENT_FIELDS)->all();
        $payload['status'] = $payload['status'] ?? $student?->status ?? 'active';
        $payload['admission_type'] = $payload['admission_type'] ?? $student?->admission_type ?? 'regular';

        if (array_key_exists('class_id', $payload)) {
            $payload['class_name'] = $payload['class_id']
                ? SchoolClass::forSchool($schoolId)->whereKey($payload['class_id'])->value('name')
                : null;
        }

        if (array_key_exists('section_id', $payload)) {
            $payload['section'] = $payload['section_id']
                ? Section::forSchool($schoolId)->whereKey($payload['section_id'])->value('name')
                : null;
        }

        return $payload;
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $guardians
     */
    public function syncGuardians(Student $student, ?array $guardians): void
    {
        if ($guardians === null) {
            return;
        }

        $sync = [];

        foreach ($guardians as $index => $guardianData) {
            $guardian = $this->upsertGuardian($student->school_id, $guardianData);
            $isPrimary = (bool) ($guardianData['is_primary'] ?? $index === 0);

            $sync[$guardian->id] = [
                'school_id' => $student->school_id,
                'relationship' => $guardianData['relation'] ?? $guardianData['relationship'] ?? $guardian->relation,
                'is_primary' => $isPrimary,
                'is_emergency_contact' => (bool) ($guardianData['is_emergency_contact'] ?? $isPrimary),
                'pickup_allowed' => (bool) ($guardianData['pickup_allowed'] ?? true),
            ];

            if ($isPrimary) {
                $student->forceFill([
                    'guardian_name' => $guardian->name,
                    'guardian_phone' => $guardian->phone,
                    'emergency_contact_name' => $student->emergency_contact_name ?: $guardian->name,
                    'emergency_contact_relation' => $student->emergency_contact_relation ?: $guardian->relation,
                    'emergency_contact_phone' => $student->emergency_contact_phone ?: $guardian->phone,
                ])->save();
            }
        }

        $student->guardians()->sync($sync);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function upsertGuardian(int $schoolId, array $data): Guardian
    {
        $payload = collect($data)
            ->only(['name', 'relation', 'phone', 'alternate_phone', 'email', 'occupation', 'address', 'status'])
            ->merge(['school_id' => $schoolId, 'status' => $data['status'] ?? 'active'])
            ->all();

        if (! empty($data['id'])) {
            $guardian = Guardian::forSchool($schoolId)->findOrFail($data['id']);
            $guardian->update($payload);

            return $guardian;
        }

        return Guardian::create($payload);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function transferPayload(Student $student, array $validated): array
    {
        if ($validated['transfer_type'] === 'outgoing') {
            return [
                'status' => 'transferred',
                'transfer_date' => $validated['transfer_date'] ?? now()->toDateString(),
                'transfer_reason' => $validated['transfer_reason'] ?? null,
            ];
        }

        return $this->studentPayload([
            'academic_session_id' => $validated['academic_session_id'] ?? $student->academic_session_id,
            'class_id' => $validated['class_id'],
            'section_id' => $validated['section_id'] ?? null,
            'roll_no' => $validated['roll_no'] ?? null,
            'status' => 'active',
            'transfer_date' => $validated['transfer_date'] ?? now()->toDateString(),
            'transfer_reason' => $validated['transfer_reason'] ?? 'Internal transfer',
        ], $student->school_id, $student);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{count: int, student_ids: array<int, int>}
     */
    public function promote(array $validated, int $schoolId): array
    {
        $toClassName = SchoolClass::forSchool($schoolId)->whereKey($validated['to_class_id'])->value('name');
        $toSectionName = ! empty($validated['to_section_id'])
            ? Section::forSchool($schoolId)->whereKey($validated['to_section_id'])->value('name')
            : null;

        $query = Student::forSchool($schoolId)
            ->where('status', 'active')
            ->where('class_id', $validated['from_class_id'])
            ->when(
                array_key_exists('from_academic_session_id', $validated),
                fn ($inner) => $inner->where('academic_session_id', $validated['from_academic_session_id']),
            )
            ->when(
                array_key_exists('from_section_id', $validated),
                fn ($inner) => $inner->where('section_id', $validated['from_section_id']),
            )
            ->when(
                ! empty($validated['student_ids']),
                fn ($inner) => $inner->whereIn('id', $validated['student_ids']),
            );

        /** @var Collection<int, Student> $students */
        $students = $query->get();

        DB::transaction(function () use ($students, $validated, $toClassName, $toSectionName) {
            $students->each(function (Student $student) use ($validated, $toClassName, $toSectionName) {
                $student->update([
                    'academic_session_id' => $validated['to_academic_session_id'] ?? $student->academic_session_id,
                    'class_id' => $validated['to_class_id'],
                    'section_id' => $validated['to_section_id'] ?? null,
                    'class_name' => $toClassName,
                    'section' => $toSectionName,
                    'roll_no' => null,
                    'status' => 'active',
                ]);
            });
        });

        return [
            'count' => $students->count(),
            'student_ids' => $students->pluck('id')->all(),
        ];
    }
}
