<?php

namespace App\Http\Controllers\Api\V1\Academic;

use App\Http\Controllers\Controller;
use App\Http\Requests\Academic\AcademicSessionRequest;
use App\Http\Resources\Academic\AcademicSessionResource;
use App\Models\AcademicSession;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicSessionController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $sessions = AcademicSession::orderByDesc('start_date')->get();

        return $this->ok(AcademicSessionResource::collection($sessions));
    }

    public function store(AcademicSessionRequest $request): JsonResponse
    {
        $session = AcademicSession::create($request->validated())->refresh();

        $this->auditLogger->log(
            school: $request->user()->school,
            user: $request->user(),
            action: 'academic_session.created',
            changes: $request->validated(),
            auditable: $session,
            ipAddress: $request->ip(),
        );

        return $this->created(new AcademicSessionResource($session), 'Academic session created.');
    }

    public function update(AcademicSessionRequest $request, AcademicSession $academicSession): JsonResponse
    {
        $original = $academicSession->only(array_keys($request->validated()));

        $academicSession->update($request->validated());

        $changes = $this->auditLogger->diff($original, $academicSession->only(array_keys($request->validated())));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $request->user()->school,
                user: $request->user(),
                action: 'academic_session.updated',
                changes: $changes,
                auditable: $academicSession,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new AcademicSessionResource($academicSession), 'Academic session updated.');
    }

    public function destroy(Request $request, AcademicSession $academicSession): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['school_admin', 'principal', 'super_admin'], true)) {
            return $this->fail('You do not have permission to delete academic sessions.', 403);
        }

        if ($academicSession->is_current) {
            return $this->fail('Cannot delete the current academic session.', 422);
        }

        $academicSession->delete();

        $this->auditLogger->log(
            school: $user->school,
            user: $user,
            action: 'academic_session.deleted',
            changes: ['name' => $academicSession->name],
            auditable: $academicSession,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Academic session deleted.');
    }

    public function setCurrent(Request $request, AcademicSession $academicSession): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['school_admin', 'principal', 'super_admin'], true)) {
            return $this->fail('You do not have permission to change the current academic session.', 403);
        }

        DB::transaction(function () use ($academicSession) {
            AcademicSession::where('id', '!=', $academicSession->id)->update(['is_current' => false]);
            $academicSession->update(['is_current' => true]);
        });

        $this->auditLogger->log(
            school: $user->school,
            user: $user,
            action: 'academic_session.set_current',
            changes: ['name' => $academicSession->name],
            auditable: $academicSession,
            ipAddress: $request->ip(),
        );

        return $this->ok(new AcademicSessionResource($academicSession->fresh()), 'Current academic session updated.');
    }
}
