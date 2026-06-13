<?php

namespace App\Http\Controllers\Api\V1\Platform\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\Auth\PlatformLoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Authentication for the Platform Super Admin panel.
 *
 * Unlike the school login (school code + email + password), a platform
 * owner has no school, so the login is email + password only and is
 * accepted only for an active `super_admin` user with a null school_id.
 * The issued token is tagged `platform` so it is easy to distinguish.
 */
class PlatformAuthController extends Controller
{
    use ApiResponse;

    public function login(PlatformLoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::whereNull('school_id')
            ->where('role', 'super_admin')
            ->where('email', $data['email'])
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            // Generic message — never reveal which field was wrong.
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account is not active.'],
            ]);
        }

        $token = $user->createToken('platform')->plainTextToken;

        return $this->ok([
            'token' => $token,
            'user' => new UserResource($user),
        ], 'Signed in successfully.');
    }

    /** Current platform admin (used to rehydrate a session on reload). */
    public function me(Request $request): JsonResponse
    {
        return $this->ok(new UserResource($request->user()));
    }

    /** Revoke the token used for the current request. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->ok(null, 'Signed out.');
    }
}
