<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route guard: blocks the request unless the authenticated user has the given
 * permission. Usage: ->middleware('permission:students.update').
 * Super admins and owner-role users bypass automatically (handled in
 * User::hasPermission via effectivePermissions).
 */
class EnsurePermission
{
    use ApiResponse;

    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $this->fail('Unauthenticated.', 401);
        }

        foreach ($permissions as $permission) {
            if (! $user->hasPermission($permission)) {
                return $this->fail('You do not have permission to perform this action.', 403);
            }
        }

        return $next($request);
    }
}
