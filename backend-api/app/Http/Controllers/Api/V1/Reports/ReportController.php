<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportOverviewRequest;
use App\Services\Reports\SchoolReportService;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    use ApiResponse;

    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function __construct(private readonly SchoolReportService $reports)
    {
    }

    public function overview(ReportOverviewRequest $request): JsonResponse
    {
        if (! in_array($request->user()->role, self::MANAGER_ROLES, true)) {
            return $this->fail('You do not have permission to view school reports.', 403);
        }

        $school = $request->user()->school;
        if (! $school) {
            return $this->fail('No school is associated with this account.', 404);
        }

        $validated = $request->validated();
        $to = CarbonImmutable::parse($validated['to'] ?? CarbonImmutable::today())->toDateString();
        $from = CarbonImmutable::parse($validated['from'] ?? CarbonImmutable::parse($to)->startOfMonth())->toDateString();

        return $this->ok($this->reports->overview($school, [
            ...$validated,
            'from' => $from,
            'to' => $to,
        ]));
    }
}
