<?php

namespace App\Http\Controllers\Api\V1\Employees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\EmployeeAssignmentRequest;
use App\Http\Requests\Employees\EmployeeRequest;
use App\Http\Resources\Employees\EmployeeResource;
use App\Models\Employee;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    use ApiResponse;

    private const EMPLOYEE_FIELDS = [
        'school_id',
        'user_id',
        'employee_code',
        'first_name',
        'last_name',
        'gender',
        'date_of_birth',
        'employee_type',
        'designation',
        'department',
        'employment_type',
        'joining_date',
        'qualification',
        'experience_years',
        'email',
        'phone',
        'alternate_phone',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'status',
    ];

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));

        $employees = Employee::with(['user', 'assignments.schoolClass', 'assignments.section', 'assignments.subject'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('employee_code', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('designation', 'like', "%{$search}%")
                        ->orWhere('department', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->when($request->filled('employee_type'), fn ($query) => $query->where('employee_type', $request->query('employee_type')))
            ->when($request->filled('department'), fn ($query) => $query->where('department', $request->query('department')))
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => EmployeeResource::collection($employees->getCollection()),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'from' => $employees->firstItem(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'to' => $employees->lastItem(),
                'total' => $employees->total(),
            ],
        ]);
    }

    public function show(Employee $employee): JsonResponse
    {
        return $this->ok(new EmployeeResource($employee->load([
            'user',
            'assignments.schoolClass',
            'assignments.section',
            'assignments.subject',
        ])));
    }

    public function store(EmployeeRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $employee = DB::transaction(function () use ($request, $validated) {
            $employeePayload = $this->employeePayload($validated, $request);
            $user = $this->upsertLoginUser($request, $validated, null, $employeePayload);

            if ($user !== null) {
                $employeePayload['user_id'] = $user->id;
            }

            $employee = Employee::create($employeePayload)->refresh();

            $this->auditLogger->log(
                school: $employee->school,
                user: $request->user(),
                action: 'employee.created',
                changes: $this->auditPayload($employeePayload, $validated),
                auditable: $employee,
                ipAddress: $request->ip(),
            );

            return $employee;
        });

        return $this->created(
            new EmployeeResource($employee->load(['user', 'assignments.schoolClass', 'assignments.section', 'assignments.subject'])),
            'Employee created.',
        );
    }

    public function update(EmployeeRequest $request, Employee $employee): JsonResponse
    {
        $validated = $request->validated();
        $employee = DB::transaction(function () use ($request, $employee, $validated) {
            $employee->load('user');
            $employeePayload = $this->employeePayload($validated, $request, $employee);
            $originalEmployee = $employee->only(array_keys($employeePayload));
            $originalUser = $employee->user?->only(['name', 'email', 'phone', 'role', 'status']) ?? [];

            $user = $this->upsertLoginUser($request, $validated, $employee, $employeePayload);

            if ($user !== null) {
                $employeePayload['user_id'] = $user->id;
            }

            $employee->update($employeePayload);
            $employee->refresh()->load('user');

            $changes = $this->auditLogger->diff(
                $originalEmployee,
                $employee->only(array_keys($employeePayload)),
            );

            if ($employee->user !== null) {
                $userChanges = $this->auditLogger->diff(
                    $originalUser,
                    $employee->user->only(['name', 'email', 'phone', 'role', 'status']),
                );

                foreach ($userChanges as $field => $change) {
                    $changes["login.$field"] = $change;
                }
            }

            if ($changes !== []) {
                $this->auditLogger->log(
                    school: $employee->school,
                    user: $request->user(),
                    action: 'employee.updated',
                    changes: $changes,
                    auditable: $employee,
                    ipAddress: $request->ip(),
                );
            }

            return $employee;
        });

        return $this->ok(
            new EmployeeResource($employee->load(['user', 'assignments.schoolClass', 'assignments.section', 'assignments.subject'])),
            'Employee updated.',
        );
    }

    public function destroy(Request $request, Employee $employee): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $employee, $user) {
            $employee->load('user');

            if ($employee->user !== null) {
                $employee->user->update(['status' => 'inactive']);
            }

            $employee->delete();

            $this->auditLogger->log(
                school: $employee->school,
                user: $user,
                action: 'employee.deleted',
                changes: [
                    'employee_code' => $employee->employee_code,
                    'full_name' => $employee->full_name,
                    'login_status' => $employee->user?->status,
                ],
                auditable: $employee,
                ipAddress: $request->ip(),
            );
        });

        return $this->ok(null, 'Employee deleted.');
    }

    public function syncAssignments(EmployeeAssignmentRequest $request, Employee $employee): JsonResponse
    {
        $validated = $request->validated();

        $employee = DB::transaction(function () use ($request, $employee, $validated) {
            $original = $employee->assignments()
                ->orderBy('id')
                ->get(['assignment_type', 'class_id', 'section_id', 'subject_id', 'status'])
                ->toArray();

            $employee->assignments()->delete();

            foreach ($validated['assignments'] as $assignment) {
                $employee->assignments()->create([
                    'school_id' => $employee->school_id,
                    'class_id' => $assignment['class_id'],
                    'section_id' => $assignment['section_id'] ?? null,
                    'subject_id' => $assignment['subject_id'] ?? null,
                    'assignment_type' => $assignment['assignment_type'],
                    'status' => $assignment['status'] ?? 'active',
                ]);
            }

            $updated = $employee->assignments()
                ->orderBy('id')
                ->get(['assignment_type', 'class_id', 'section_id', 'subject_id', 'status'])
                ->toArray();

            $this->auditLogger->log(
                school: $employee->school,
                user: $request->user(),
                action: 'employee.assignments_synced',
                changes: [
                    'old' => $original,
                    'new' => $updated,
                ],
                auditable: $employee,
                ipAddress: $request->ip(),
            );

            return $employee;
        });

        return $this->ok(
            new EmployeeResource($employee->load(['user', 'assignments.schoolClass', 'assignments.section', 'assignments.subject'])),
            'Employee assignments updated.',
        );
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function employeePayload(array $validated, Request $request, ?Employee $employee = null): array
    {
        $payload = collect($validated)
            ->only(self::EMPLOYEE_FIELDS)
            ->reject(fn ($value, string $key) => $key === 'school_id' && $employee !== null)
            ->all();

        $payload['school_id'] = $employee?->school_id ?? $request->user()->school_id ?? $validated['school_id'];
        $payload['status'] = $payload['status'] ?? $employee?->status ?? 'active';

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $employeePayload
     */
    private function upsertLoginUser(
        Request $request,
        array $validated,
        ?Employee $employee,
        array $employeePayload,
    ): ?User {
        $loginEnabled = (bool) ($validated['login_enabled'] ?? false);

        if (! $loginEnabled) {
            if ($employee?->user !== null) {
                $employee->user->update(['status' => 'inactive']);

                return $employee->user;
            }

            return null;
        }

        $user = $employee?->user;
        $loginEmail = $validated['login_email'] ?? $employeePayload['email'];
        $role = $validated['login_role'] ?? $user?->role ?? $this->defaultLoginRole($employeePayload['employee_type']);

        $userPayload = [
            'school_id' => $employee?->school_id ?? $request->user()->school_id ?? $validated['school_id'],
            'name' => trim($employeePayload['first_name'].' '.($employeePayload['last_name'] ?? '')),
            'email' => $loginEmail,
            'phone' => $employeePayload['phone'] ?? null,
            'role' => $role,
            'status' => $validated['login_status'] ?? 'active',
        ];

        if (! empty($validated['login_password'])) {
            $userPayload['password'] = Hash::make($validated['login_password']);
        }

        if ($user === null) {
            $user = User::create($userPayload);
        } else {
            $user->update($userPayload);
        }

        return $user;
    }

    private function defaultLoginRole(string $employeeType): string
    {
        return $employeeType === 'teaching' ? 'teacher' : 'staff';
    }

    /**
     * @param  array<string, mixed>  $employeePayload
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function auditPayload(array $employeePayload, array $validated): array
    {
        return collect($employeePayload)
            ->except(['user_id'])
            ->merge([
                'login_enabled' => (bool) ($validated['login_enabled'] ?? false),
                'login_email' => $validated['login_email'] ?? null,
                'login_role' => $validated['login_role'] ?? null,
            ])
            ->reject(fn ($value) => $value === null)
            ->all();
    }
}
