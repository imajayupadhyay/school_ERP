<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SchoolResource;
use App\Services\DashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly DashboardService $dashboard)
    {
    }

    /** School Admin dashboard summary, scoped to the authenticated user's school. */
    public function index(Request $request): JsonResponse
    {
        $school = $request->user()->school;

        if (! $school) {
            return $this->fail('No school is associated with this account.', 404);
        }

        return $this->ok([
            'school' => new SchoolResource($school),
            ...$this->dashboard->forSchool($school),
        ]);
    }
}
