<?php

namespace App\Http\Requests\Employees;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class EmployeeRequest extends FormRequest
{
    private const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin'];

    private const LOGIN_ROLES = [
        'school_admin',
        'principal',
        'teacher',
        'accountant',
        'librarian',
        'receptionist',
        'transport_manager',
        'hostel_warden',
        'staff',
    ];

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
        $employee = $this->route('employee');
        $schoolId = $this->targetSchoolId($employee instanceof Employee ? $employee : null);

        return [
            'school_id' => [
                $this->user()?->school_id === null && $this->isMethod('post') ? 'required' : 'prohibited',
                'integer',
                Rule::exists('schools', 'id'),
            ],
            'employee_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('employees', 'employee_code')
                    ->where('school_id', $schoolId)
                    ->ignore($employee?->id),
            ],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', 'in:male,female,other'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'employee_type' => ['required', 'in:teaching,non_teaching'],
            'designation' => ['nullable', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:120'],
            'employment_type' => ['required', 'in:full_time,part_time,contract,temporary'],
            'joining_date' => ['nullable', 'date'],
            'qualification' => ['nullable', 'string', 'max:180'],
            'experience_years' => ['nullable', 'numeric', 'min:0', 'max:80'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('employees', 'email')
                    ->where('school_id', $schoolId)
                    ->ignore($employee?->id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'alternate_phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:1000'],
            'emergency_contact_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'status' => ['nullable', 'in:active,inactive,on_leave,terminated'],
            'login_enabled' => ['sometimes', 'boolean'],
            'login_email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->where('school_id', $schoolId)
                    ->ignore($employee?->user_id),
            ],
            'login_password' => ['nullable', 'string', 'min:8', 'max:100'],
            'login_role' => ['nullable', Rule::in(self::LOGIN_ROLES)],
            'login_status' => ['nullable', 'in:active,inactive,suspended'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $employee = $this->route('employee');
                $employee = $employee instanceof Employee ? $employee : null;

                if (! $this->boolean('login_enabled')) {
                    return;
                }

                $loginEmail = $this->input('login_email') ?: $this->input('email');

                if (! $loginEmail) {
                    $validator->errors()->add('login_email', 'An email address is required when login access is enabled.');
                }

                if (($this->isMethod('post') || $employee?->user_id === null) && ! $this->input('login_password')) {
                    $validator->errors()->add('login_password', 'A password is required when creating login access.');
                }
            },
        ];
    }

    private function targetSchoolId(?Employee $employee): ?int
    {
        if ($employee !== null) {
            return $employee->school_id;
        }

        return $this->user()?->school_id ?? $this->integer('school_id') ?: null;
    }
}
