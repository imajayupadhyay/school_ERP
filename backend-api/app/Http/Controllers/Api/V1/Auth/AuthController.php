<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\School;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Authenticate a school user with school code + email + password.
     * Tenancy is resolved server-side from the school code; the issued token
     * is bound to the user (and therefore their school_id).
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $school = School::where('code', $data['school_code'])
            ->where('status', 'active')
            ->first();

        $user = $school
            ? User::where('school_id', $school->id)
                ->where('email', $data['email'])
                ->first()
            : null;

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            // Generic message — never reveal which of code/email/password was wrong.
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account is not active. Please contact your administrator.'],
            ]);
        }

        $token = $user->createToken('web')->plainTextToken;
        $user->load('school', 'roleModel.permissions', 'permissionOverrides.permission');

        return $this->ok([
            'token' => $token,
            'user' => new UserResource($user),
        ], 'Signed in successfully.');
    }

    /** Current authenticated user + their school. */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('school', 'roleModel.permissions', 'permissionOverrides.permission');

        return $this->ok(new UserResource($user));
    }

    /** Revoke the token used for the current request. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->ok(null, 'Signed out.');
    }
}
