<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the Platform Super Admin area. Only a platform owner
 * (User::isSuperAdmin() — role `super_admin`, no school) may pass.
 *
 * This is intentionally separate from the school-level `permission`
 * middleware: the platform panel is a different surface with its own
 * login path, so a normal school user can never reach it even with a
 * valid Sanctum token.
 */
class EnsurePlatformAdmin
{
    use ApiResponse;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $this->fail('Unauthenticated.', 401);
        }

        if (! $user->isSuperAdmin() || $user->school_id !== null) {
            return $this->fail('This area is restricted to platform administrators.', 403);
        }

        return $next($request);
    }
}
