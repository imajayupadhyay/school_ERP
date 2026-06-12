<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\AuditLogIndexRequest;
use App\Http\Resources\Reports\AuditLogResource;
use App\Models\AuditLog;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class AuditLogController extends Controller
{
    use ApiResponse;

    private const MANAGER_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function index(AuditLogIndexRequest $request): JsonResponse
    {
        if (! $this->canView($request)) {
            return $this->fail('You do not have permission to view audit logs.', 403);
        }

        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $query = $this->filteredQuery($request);

        $logs = $query
            ->with('user')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => AuditLogResource::collection($logs->getCollection()),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'from' => $logs->firstItem(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'to' => $logs->lastItem(),
                'total' => $logs->total(),
            ],
        ]);
    }

    public function summary(AuditLogIndexRequest $request): JsonResponse
    {
        if (! $this->canView($request)) {
            return $this->fail('You do not have permission to view audit logs.', 403);
        }

        $query = $this->filteredQuery($request);
        $logs = (clone $query)->with('user')->get();
        $recent = (clone $query)
            ->with('user')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get();
        $modules = $logs
            ->groupBy(fn (AuditLog $log) => Str::before($log->action, '.'))
            ->map(fn ($items, string $module) => ['module' => $module, 'count' => $items->count()])
            ->sortByDesc('count')
            ->values();
        $actors = $logs
            ->filter(fn (AuditLog $log) => $log->user !== null)
            ->groupBy('user_id')
            ->map(fn ($items) => [
                'user_id' => $items->first()->user_id,
                'name' => $items->first()->user?->name,
                'role' => $items->first()->user?->role,
                'count' => $items->count(),
            ])
            ->sortByDesc('count')
            ->take(5)
            ->values();

        return $this->ok([
            'total' => $logs->count(),
            'actors' => $logs->pluck('user_id')->filter()->unique()->count(),
            'modules' => $modules,
            'top_actors' => $actors,
            'recent' => AuditLogResource::collection($recent),
        ]);
    }

    private function canView(AuditLogIndexRequest $request): bool
    {
        return $request->user()->school !== null
            && in_array($request->user()->role, self::MANAGER_ROLES, true);
    }

    private function filteredQuery(AuditLogIndexRequest $request): Builder
    {
        $validated = $request->validated();
        $to = CarbonImmutable::parse($validated['to'] ?? CarbonImmutable::today())->toDateString();
        $from = CarbonImmutable::parse($validated['from'] ?? CarbonImmutable::parse($to)->startOfMonth())->toDateString();
        $search = trim((string) ($validated['search'] ?? ''));
        $module = trim((string) ($validated['module'] ?? ''));
        $action = trim((string) ($validated['action'] ?? ''));

        return AuditLog::query()
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $inner) use ($search) {
                    $inner
                        ->where('action', 'like', "%{$search}%")
                        ->orWhere('auditable_type', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%")
                        ->orWhereHas('user', function (Builder $user) use ($search) {
                            $user->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('role', 'like', "%{$search}%");
                        });
                });
            })
            ->when($module !== '', fn (Builder $query) => $query->where('action', 'like', "{$module}.%"))
            ->when($action !== '', fn (Builder $query) => $query->where('action', $action))
            ->when(! empty($validated['user_id']), fn (Builder $query) => $query->where('user_id', $validated['user_id']))
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to);
    }
}
