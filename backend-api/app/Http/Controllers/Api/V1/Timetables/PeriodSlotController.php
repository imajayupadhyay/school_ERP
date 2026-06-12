<?php

namespace App\Http\Controllers\Api\V1\Timetables;

use App\Http\Controllers\Controller;
use App\Http\Requests\Timetables\PeriodSlotRequest;
use App\Http\Resources\Timetables\PeriodSlotResource;
use App\Models\PeriodSlot;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeriodSlotController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(): JsonResponse
    {
        $slots = PeriodSlot::query()->orderBy('sequence')->get();

        return $this->ok(PeriodSlotResource::collection($slots));
    }

    public function store(PeriodSlotRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['is_break'] = $payload['is_break'] ?? false;
        $payload['status'] = $payload['status'] ?? 'active';

        $slot = PeriodSlot::create($payload)->refresh();

        $this->auditLogger->log(
            school: $slot->school,
            user: $request->user(),
            action: 'period_slot.created',
            changes: $payload,
            auditable: $slot,
            ipAddress: $request->ip(),
        );

        return $this->created(new PeriodSlotResource($slot), 'Period slot created.');
    }

    public function update(PeriodSlotRequest $request, PeriodSlot $periodSlot): JsonResponse
    {
        $payload = $request->validated();
        $original = $periodSlot->only(array_keys($payload));

        $periodSlot->update($payload);
        $periodSlot->refresh();

        $changes = $this->auditLogger->diff($original, $periodSlot->only(array_keys($payload)));
        if ($changes !== []) {
            $this->auditLogger->log(
                school: $periodSlot->school,
                user: $request->user(),
                action: 'period_slot.updated',
                changes: $changes,
                auditable: $periodSlot,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new PeriodSlotResource($periodSlot), 'Period slot updated.');
    }

    public function destroy(Request $request, PeriodSlot $periodSlot): JsonResponse
    {
        $this->auditLogger->log(
            school: $periodSlot->school,
            user: $request->user(),
            action: 'period_slot.deleted',
            changes: ['name' => ['old' => $periodSlot->name, 'new' => null]],
            auditable: $periodSlot,
            ipAddress: $request->ip(),
        );

        $periodSlot->delete();

        return $this->ok(null, 'Period slot deleted.');
    }
}
