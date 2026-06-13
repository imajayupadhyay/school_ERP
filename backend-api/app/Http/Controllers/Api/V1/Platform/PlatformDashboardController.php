<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Services\Platform\PlatformDashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PlatformDashboardController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly PlatformDashboardService $dashboard)
    {
    }

    public function index(): JsonResponse
    {
        return $this->ok($this->dashboard->overview());
    }
}
