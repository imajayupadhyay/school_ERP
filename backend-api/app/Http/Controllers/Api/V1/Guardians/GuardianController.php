<?php

namespace App\Http\Controllers\Api\V1\Guardians;

use App\Http\Controllers\Controller;
use App\Http\Requests\Guardians\GuardianRequest;
use App\Http\Requests\Guardians\ResetGuardianPasswordRequest;
use App\Http\Requests\Guardians\SyncGuardianStudentsRequest;
use App\Http\Resources\Guardians\GuardianResource;
use App\Models\Guardian;
use App\Services\GuardianService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class GuardianController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly GuardianService $guardianService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));

        $guardians = Guardian::with(['user', 'students'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('alternate_phone', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('occupation', 'like', "%{$search}%")
                        ->orWhereHas('students', function ($studentQuery) use ($search) {
                            $studentQuery
                                ->where('admission_no', 'like', "%{$search}%")
                                ->orWhere('first_name', 'like', "%{$search}%")
                                ->orWhere('middle_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->when($request->filled('portal_status'), fn ($query) => $query->whereHas('user', fn ($userQuery) => $userQuery->where('status', $request->query('portal_status'))))
            ->when($request->filled('student_id'), fn ($query) => $query->whereHas('students', fn ($studentQuery) => $studentQuery->whereKey($request->integer('student_id'))))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => GuardianResource::collection($guardians->getCollection()),
            'meta' => [
                'current_page' => $guardians->currentPage(),
                'from' => $guardians->firstItem(),
                'last_page' => $guardians->lastPage(),
                'per_page' => $guardians->perPage(),
                'to' => $guardians->lastItem(),
                'total' => $guardians->total(),
            ],
        ]);
    }

    public function store(GuardianRequest $request): JsonResponse
    {
        $guardian = DB::transaction(function () use ($request) {
            $payload = $this->guardianService->guardianPayload($request->validated());
            $user = $this->guardianService->upsertPortalUser(
                validated: $request->validated(),
                guardianPayload: $payload,
                schoolId: $request->user()->school_id,
            );

            if ($user !== null) {
                $payload['user_id'] = $user->id;
            }

            $guardian = Guardian::create($payload)->refresh();

            $this->auditLogger->log(
                school: $guardian->school,
                user: $request->user(),
                action: 'guardian.created',
                changes: [
                    ...$payload,
                    'portal_enabled' => (bool) ($request->validated('portal_enabled') ?? false),
                ],
                auditable: $guardian,
                ipAddress: $request->ip(),
            );

            return $guardian;
        });

        return $this->created(new GuardianResource($guardian->load(['user', 'students'])), 'Guardian created.');
    }

    public function show(Request $request, Guardian $guardian): JsonResponse
    {
        return $this->ok(new GuardianResource($guardian->load(['user', 'students'])));
    }

    public function update(GuardianRequest $request, Guardian $guardian): JsonResponse
    {
        $guardian = DB::transaction(function () use ($request, $guardian) {
            $guardian->load('user');
            $payload = $this->guardianService->guardianPayload($request->validated(), $guardian);
            $original = $guardian->only(array_keys($payload));
            $originalUser = $guardian->user?->only(['name', 'email', 'phone', 'role', 'status']) ?? [];

            $user = $this->guardianService->upsertPortalUser(
                validated: $request->validated(),
                guardianPayload: $payload,
                schoolId: $guardian->school_id,
                guardian: $guardian,
            );

            if ($user !== null) {
                $payload['user_id'] = $user->id;
            }

            $guardian->update($payload);
            $guardian->refresh()->load('user');

            $changes = $this->auditLogger->diff($original, $guardian->only(array_keys($payload)));

            if ($guardian->user !== null) {
                $userChanges = $this->auditLogger->diff(
                    $originalUser,
                    $guardian->user->only(['name', 'email', 'phone', 'role', 'status']),
                );

                foreach ($userChanges as $field => $change) {
                    $changes["portal.$field"] = $change;
                }
            }

            if ($changes !== []) {
                $this->auditLogger->log(
                    school: $guardian->school,
                    user: $request->user(),
                    action: 'guardian.updated',
                    changes: $changes,
                    auditable: $guardian,
                    ipAddress: $request->ip(),
                );
            }

            return $guardian;
        });

        return $this->ok(new GuardianResource($guardian->load(['user', 'students'])), 'Guardian updated.');
    }

    public function destroy(Request $request, Guardian $guardian): JsonResponse
    {
        $guardian->load('user');
        $original = [
            'status' => $guardian->status,
            'portal_status' => $guardian->user?->status,
        ];

        DB::transaction(function () use ($guardian) {
            $guardian->update(['status' => 'inactive']);

            if ($guardian->user !== null) {
                $guardian->user->update(['status' => 'inactive']);
            }
        });

        $this->auditLogger->log(
            school: $guardian->school,
            user: $request->user(),
            action: 'guardian.archived',
            changes: [
                'status' => ['old' => $original['status'], 'new' => 'inactive'],
                'portal_status' => ['old' => $original['portal_status'], 'new' => $guardian->fresh('user')->user?->status],
            ],
            auditable: $guardian,
            ipAddress: $request->ip(),
        );

        return $this->ok(new GuardianResource($guardian->fresh(['user', 'students'])), 'Guardian archived.');
    }

    public function syncStudents(SyncGuardianStudentsRequest $request, Guardian $guardian): JsonResponse
    {
        $original = $guardian->students()
            ->orderBy('students.id')
            ->get(['students.id'])
            ->map(fn ($student) => [
                'student_id' => $student->id,
                'relationship' => $student->pivot->relationship,
                'is_primary' => (bool) $student->pivot->is_primary,
                'is_emergency_contact' => (bool) $student->pivot->is_emergency_contact,
                'pickup_allowed' => (bool) $student->pivot->pickup_allowed,
            ])
            ->all();

        $this->guardianService->syncStudents($guardian, $request->validated('students'));

        $updated = $guardian->fresh('students')->students
            ->sortBy('id')
            ->values()
            ->map(fn ($student) => [
                'student_id' => $student->id,
                'relationship' => $student->pivot->relationship,
                'is_primary' => (bool) $student->pivot->is_primary,
                'is_emergency_contact' => (bool) $student->pivot->is_emergency_contact,
                'pickup_allowed' => (bool) $student->pivot->pickup_allowed,
            ])
            ->all();

        $this->auditLogger->log(
            school: $guardian->school,
            user: $request->user(),
            action: 'guardian.students_synced',
            changes: ['old' => $original, 'new' => $updated],
            auditable: $guardian,
            ipAddress: $request->ip(),
        );

        return $this->ok(new GuardianResource($guardian->fresh(['user', 'students'])), 'Guardian child links updated.');
    }

    public function resetPassword(ResetGuardianPasswordRequest $request, Guardian $guardian): JsonResponse
    {
        $guardian->load('user');

        if ($guardian->user === null) {
            return $this->fail('This guardian does not have parent portal access enabled.', 422);
        }

        $guardian->user->update([
            'password' => Hash::make($request->validated('password')),
            'status' => 'active',
        ]);

        $this->auditLogger->log(
            school: $guardian->school,
            user: $request->user(),
            action: 'guardian.password_reset',
            changes: ['portal_status' => 'active'],
            auditable: $guardian,
            ipAddress: $request->ip(),
        );

        return $this->ok(new GuardianResource($guardian->fresh(['user', 'students'])), 'Guardian portal password reset.');
    }
}
