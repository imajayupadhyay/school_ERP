<?php

namespace App\Http\Requests\Students;

use App\Models\Section;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StudentRequest extends FormRequest
{
    private const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && in_array($user->role, self::EDITOR_ROLES, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $student = $this->route('student');
        $student = $student instanceof Student ? $student : null;
        $schoolId = $this->user()->school_id ?? $student?->school_id;

        return [
            'academic_session_id' => [
                'nullable',
                'integer',
                Rule::exists('academic_sessions', 'id')->where('school_id', $schoolId),
            ],
            'admission_no' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('students', 'admission_no')
                    ->where('school_id', $schoolId)
                    ->ignore($student?->id),
            ],
            'admission_type' => ['nullable', 'in:regular,transfer,online,walk_in'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', 'in:male,female,other'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'class_id' => [
                'nullable',
                'integer',
                Rule::exists('classes', 'id')->where('school_id', $schoolId),
            ],
            'section_id' => [
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where('school_id', $schoolId),
            ],
            'roll_no' => ['nullable', 'string', 'max:30'],
            'house' => ['nullable', 'string', 'max:80'],
            'category' => ['nullable', 'string', 'max:80'],
            'religion' => ['nullable', 'string', 'max:80'],
            'blood_group' => ['nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
            'nationality' => ['nullable', 'string', 'max:80'],
            'mother_tongue' => ['nullable', 'string', 'max:80'],
            'primary_phone' => ['nullable', 'string', 'max:30'],
            'primary_email' => ['nullable', 'email', 'max:255'],
            'current_address' => ['nullable', 'string', 'max:1000'],
            'permanent_address' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],
            'guardian_name' => ['nullable', 'string', 'max:120'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'emergency_contact_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact_relation' => ['nullable', 'string', 'max:80'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'medical_conditions' => ['nullable', 'string', 'max:255'],
            'allergies' => ['nullable', 'string', 'max:255'],
            'medications' => ['nullable', 'string', 'max:255'],
            'doctor_name' => ['nullable', 'string', 'max:120'],
            'doctor_phone' => ['nullable', 'string', 'max:30'],
            'previous_school_name' => ['nullable', 'string', 'max:150'],
            'previous_school_board' => ['nullable', 'string', 'max:120'],
            'previous_school_class' => ['nullable', 'string', 'max:80'],
            'previous_school_transfer_certificate_no' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:active,inactive,archived,transferred,alumni'],
            'admission_date' => ['nullable', 'date'],
            'guardians' => ['nullable', 'array', 'max:4'],
            'guardians.*.id' => [
                'nullable',
                'integer',
                Rule::exists('guardians', 'id')->where('school_id', $schoolId),
            ],
            'guardians.*.name' => ['required_with:guardians', 'string', 'max:120'],
            'guardians.*.relation' => ['nullable', 'string', 'max:80'],
            'guardians.*.phone' => ['nullable', 'string', 'max:30'],
            'guardians.*.alternate_phone' => ['nullable', 'string', 'max:30'],
            'guardians.*.email' => ['nullable', 'email', 'max:255'],
            'guardians.*.occupation' => ['nullable', 'string', 'max:120'],
            'guardians.*.address' => ['nullable', 'string', 'max:1000'],
            'guardians.*.is_primary' => ['sometimes', 'boolean'],
            'guardians.*.is_emergency_contact' => ['sometimes', 'boolean'],
            'guardians.*.pickup_allowed' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $student = $this->route('student');
                $student = $student instanceof Student ? $student : null;
                $schoolId = $this->user()->school_id ?? $student?->school_id;
                $classId = $this->integer('class_id') ?: null;
                $sectionId = $this->integer('section_id') ?: null;
                $sessionId = $this->integer('academic_session_id') ?: null;
                $rollNo = $this->input('roll_no');

                if ($sectionId !== null && $classId === null) {
                    $validator->errors()->add('section_id', 'Select a class before selecting a section.');
                }

                if ($sectionId !== null && $classId !== null) {
                    $sectionMatchesClass = Section::forSchool($schoolId)
                        ->whereKey($sectionId)
                        ->where('class_id', $classId)
                        ->exists();

                    if (! $sectionMatchesClass) {
                        $validator->errors()->add('section_id', 'The selected section does not belong to the selected class.');
                    }
                }

                if ($rollNo && $classId !== null) {
                    $duplicateRoll = Student::forSchool($schoolId)
                        ->where('roll_no', $rollNo)
                        ->where('academic_session_id', $sessionId)
                        ->where('class_id', $classId)
                        ->where('section_id', $sectionId)
                        ->when($student, fn ($query) => $query->whereKeyNot($student->id))
                        ->exists();

                    if ($duplicateRoll) {
                        $validator->errors()->add('roll_no', 'This roll number is already assigned in the selected class, section, and session.');
                    }
                }

                $guardians = $this->input('guardians', []);

                if (is_array($guardians) && $guardians !== []) {
                    $primaryCount = collect($guardians)->filter(fn ($guardian) => (bool) ($guardian['is_primary'] ?? false))->count();

                    if ($primaryCount > 1) {
                        $validator->errors()->add('guardians', 'Only one guardian can be marked as primary.');
                    }
                }
            },
        ];
    }
}
