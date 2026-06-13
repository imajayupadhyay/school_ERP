<?php

namespace App\Http\Controllers\Api\V1\Timetables;

use App\Http\Controllers\Controller;
use App\Http\Requests\Timetables\PeriodSlotRequest;
use App\Http\Resources\Timetables\PeriodSlotResource;
use App\Models\PeriodSlot;
use App\Models\SchoolClass;
use App\Models\TimetableEntry;
use App\Services\Timetables\PeriodSlotResolver;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeriodSlotController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly PeriodSlotResolver $resolver,
    ) {}

    /**
     * List period slots. With `?class_id=` returns that class's effective slots
     * (its own override, or the inherited default set); without it, the school
     * default template only.
     */
    public function index(Request $request): JsonResponse
    {
        $classId = $request->integer('class_id') ?: null;

        if ($classId !== null) {
            $slots = $this->resolver->effectiveSlotsForClass($classId);
            $inherited = ! $this->resolver->classHasOwnSlots($classId);
        } else {
            $slots = $this->resolver->defaultSlots();
            $inherited = false;
        }

        return response()->json([
            'data' => PeriodSlotResource::collection($slots),
            'meta' => ['inherited' => $inherited, 'class_id' => $classId],
        ]);
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
        // A slot never changes scope on update.
        unset($payload['class_id']);
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

    /**
     * Clone the school default schedule into a class so it can be customised.
     */
    public function copyDefaultToClass(Request $request, SchoolClass $class): JsonResponse
    {
        if ($this->resolver->classHasOwnSlots($class->id)) {
            return $this->fail('This class already has a custom schedule.', 422);
        }

        if ($this->resolver->defaultSlots()->isEmpty()) {
            return $this->fail('There is no default schedule to copy. Create the school default first.', 422);
        }

        $slots = $this->resolver->copyDefaultInto($class->id);

        $this->auditLogger->log(
            school: $class->school,
            user: $request->user(),
            action: 'period_slot.schedule_copied',
            changes: ['class_id' => $class->id, 'slots_copied' => $slots->count()],
            auditable: $class,
            ipAddress: $request->ip(),
        );

        return $this->created(
            PeriodSlotResource::collection($slots),
            'Custom schedule created from the school default.',
        );
    }

    /**
     * Remove a class's custom schedule, reverting it to the school default.
     */
    public function deleteClassSchedule(Request $request, SchoolClass $class): JsonResponse
    {
        if (! $this->resolver->classHasOwnSlots($class->id)) {
            return $this->fail('This class has no custom schedule to remove.', 422);
        }

        $slotIds = PeriodSlot::query()->where('class_id', $class->id)->pluck('id')->all();

        $inUse = TimetableEntry::query()
            ->whereIn('period_slot_id', $slotIds)
            ->whereHas('timetable', fn ($query) => $query->where('status', 'published'))
            ->exists();

        if ($inUse) {
            return $this->fail(
                'A published timetable uses this schedule. Unpublish it before reverting to the default.',
                422,
            );
        }

        $this->resolver->removeClassSchedule($class->id);

        $this->auditLogger->log(
            school: $class->school,
            user: $request->user(),
            action: 'period_slot.schedule_reverted',
            changes: ['class_id' => $class->id],
            auditable: $class,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Custom schedule removed. This class now uses the school default.');
    }
}
