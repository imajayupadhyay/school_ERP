<?php

namespace App\Http\Controllers\Api\V1\Access;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use App\Support\PermissionRegistry;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    use ApiResponse;

    /** Grouped permission catalog for the matrix UI + the flat key list. */
    public function index(): JsonResponse
    {
        return $this->ok([
            'groups' => PermissionRegistry::grouped(),
            'keys' => PermissionRegistry::keys(),
        ]);
    }
}
