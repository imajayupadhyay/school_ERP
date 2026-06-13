<?php

namespace App\Http\Controllers\Api\V1\Platform\Schools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\Schools\StoreSchoolRequest;
use App\Http\Requests\Platform\Schools\UpdateSchoolRequest;
use App\Http\Resources\Platform\PlatformSchoolResource;
use App\Models\School;
use App\Services\Platform\SchoolDeletionService;
use App\Services\Platform\SchoolProvisioningService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Platform Super Admin management of school tenants.
 * The whole controller sits behind the `platform.admin` middleware, so a
 * normal school user can never reach it. School is the tenant root (no
 * BelongsToSchool scope), so route-model binding resolves any school.
 */
class SchoolController extends Controller
{
    use ApiResponse;

    /** School profile fields a platform admin may edit (admin_* excluded). */
    private const SCHOOL_FIELDS = [
        'name', 'code', 'status', 'email', 'phone', 'alternate_phone', 'website',
        'address', 'address_line2', 'city', 'state', 'postal_code', 'country',
        'timezone', 'date_format', 'currency', 'academic_year_start_month',
        'board_affiliation', 'registration_number', 'udise_code', 'principal_name',
        'established_year',
    ];

    public function __construct(
        private readonly SchoolProvisioningService $provisioning,
        private readonly SchoolDeletionService $deletion,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));

        $schools = School::query()
            ->withCount(['students', 'employees', 'users'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => PlatformSchoolResource::collection($schools->getCollection()),
            'meta' => [
                'current_page' => $schools->currentPage(),
                'from' => $schools->firstItem(),
                'last_page' => $schools->lastPage(),
                'per_page' => $schools->perPage(),
                'to' => $schools->lastItem(),
                'total' => $schools->total(),
            ],
        ]);
    }

    public function store(StoreSchoolRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $schoolData = collect($validated)->only(self::SCHOOL_FIELDS)->all();
        $adminData = [
            'name' => $validated['admin_name'],
            'email' => $validated['admin_email'],
            'phone' => $validated['admin_phone'] ?? null,
            'password' => $validated['admin_password'] ?? null,
        ];

        $result = $this->provisioning->createSchool(
            $schoolData,
            $adminData,
            $request->user(),
            $request->ip(),
        );

        $school = $result['school']->loadCount(['students', 'employees', 'users']);

        return $this->created([
            'school' => new PlatformSchoolResource($school),
            'admin' => [
                'id' => $result['admin']->id,
                'name' => $result['admin']->name,
                'email' => $result['admin']->email,
            ],
            // Returned ONCE so the platform admin can hand it off; not stored anywhere.
            'temporary_password' => $result['temporary_password'],
        ], 'School created.');
    }

    public function show(School $school): JsonResponse
    {
        $school->loadCount(['students', 'employees', 'users']);
        $school->load(['users' => fn ($q) => $q->whereIn('role', ['school_admin', 'principal'])->orderBy('name')]);

        return $this->ok(new PlatformSchoolResource($school));
    }

    public function update(UpdateSchoolRequest $request, School $school): JsonResponse
    {
        $validated = $request->validated();
        $original = $school->only(array_keys($validated));

        $school->update($validated);

        $changes = $this->auditLogger->diff($original, $school->only(array_keys($validated)));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $school,
                user: $request->user(),
                action: 'school.updated',
                changes: $changes,
                auditable: $school,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(
            new PlatformSchoolResource($school->loadCount(['students', 'employees', 'users'])),
            'School updated.',
        );
    }

    public function updateStatus(Request $request, School $school): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
        ]);

        $this->provisioning->setStatus($school, $validated['status'], $request->user(), $request->ip());

        return $this->ok(
            new PlatformSchoolResource($school->loadCount(['students', 'employees', 'users'])),
            'School status updated.',
        );
    }

    /**
     * Permanently delete a school and ALL of its data.
     *
     * Safety: the caller must echo back the school's exact code in
     * `confirm_code`. This blocks accidental/automated deletions even though
     * the route is already restricted to platform admins.
     */
    public function destroy(Request $request, School $school): JsonResponse
    {
        $request->validate([
            'confirm_code' => ['required', 'string'],
        ]);

        if ((string) $request->input('confirm_code') !== (string) $school->code) {
            return $this->fail('The confirmation code does not match the school code.', 422, [
                'confirm_code' => ['Type the school code exactly to confirm deletion.'],
            ]);
        }

        $this->deletion->delete($school, $request->user(), $request->ip());

        return $this->ok(null, 'School and all related data permanently deleted.');
    }
}
