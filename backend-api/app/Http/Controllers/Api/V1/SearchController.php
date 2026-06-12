<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\GlobalSearchService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly GlobalSearchService $search) {}

    public function index(Request $request): JsonResponse
    {
        $results = $this->search->search($request->user(), (string) $request->query('q', ''));

        return $this->ok($results);
    }
}
