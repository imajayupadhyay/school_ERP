<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SchoolProfile\UpdateSchoolProfileRequest;
use App\Http\Resources\SchoolProfileResource;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SchoolProfileController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    /** View the authenticated user's school profile. */
    public function show(Request $request): JsonResponse
    {
        $school = $request->user()->school;

        if (! $school) {
            return $this->fail('No school is associated with this account.', 404);
        }

        return $this->ok(new SchoolProfileResource($school));
    }

    /** Update the authenticated user's school profile. */
    public function update(UpdateSchoolProfileRequest $request): JsonResponse
    {
        $school = $request->user()->school;

        if (! $school) {
            return $this->fail('No school is associated with this account.', 404);
        }

        $original = $school->only(array_keys($request->validated()));

        $school->update($request->validated());

        $changes = $this->auditLogger->diff($original, $school->only(array_keys($request->validated())));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $school,
                user: $request->user(),
                action: 'school_profile.updated',
                changes: $changes,
                auditable: $school,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new SchoolProfileResource($school), 'School profile updated.');
    }

    /** Upload or replace the school logo. */
    public function uploadLogo(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, ['school_admin', 'principal', 'super_admin'], true)) {
            return $this->fail('You do not have permission to update the school logo.', 403);
        }

        $school = $user->school;

        if (! $school) {
            return $this->fail('No school is associated with this account.', 404);
        }

        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
        ]);

        if ($school->logo_path) {
            Storage::disk('public')->delete($school->logo_path);
        }

        $path = $request->file('logo')->store("schools/{$school->id}", 'public');

        $oldPath = $school->logo_path;
        $school->update(['logo_path' => $path]);

        $this->auditLogger->log(
            school: $school,
            user: $user,
            action: 'school_profile.logo_updated',
            changes: ['logo_path' => ['old' => $oldPath, 'new' => $path]],
            auditable: $school,
            ipAddress: $request->ip(),
        );

        return $this->ok(new SchoolProfileResource($school), 'School logo updated.');
    }
}
