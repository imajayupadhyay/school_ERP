<?php

namespace App\Services\Timetables;

use App\Models\PeriodSlot;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Resolves which period slots apply to a class.
 *
 * Period slots are either school-wide DEFAULTS (`class_id = NULL`) or a class
 * OVERRIDE (`class_id = X`). A class uses its own override slots if it has any,
 * otherwise it inherits the school default set. This is the single source of
 * truth for "effective slots", reused by the API, entry validation, and seeder.
 *
 * The `BelongsToSchool` global scope on PeriodSlot keeps every query here
 * tenant-safe, so no explicit `school_id` filter is needed in request context.
 */
class PeriodSlotResolver
{
    /**
     * The school default template (slots not scoped to any class), ordered.
     *
     * @return Collection<int, PeriodSlot>
     */
    public function defaultSlots(): Collection
    {
        return PeriodSlot::query()->whereNull('class_id')->orderBy('sequence')->get();
    }

    /**
     * The slots that apply to a class: its own override if any, else the default.
     *
     * @return Collection<int, PeriodSlot>
     */
    public function effectiveSlotsForClass(int $classId): Collection
    {
        $own = PeriodSlot::query()->where('class_id', $classId)->orderBy('sequence')->get();

        return $own->isNotEmpty() ? $own : $this->defaultSlots();
    }

    /**
     * Non-break, active effective slot IDs for a class (used for entry validation).
     *
     * @return array<int, int>
     */
    public function effectiveSlotIdsForClass(int $classId): array
    {
        return $this->effectiveSlotsForClass($classId)
            ->where('is_break', false)
            ->where('status', 'active')
            ->pluck('id')
            ->all();
    }

    public function classHasOwnSlots(int $classId): bool
    {
        return PeriodSlot::query()->where('class_id', $classId)->exists();
    }

    /**
     * Clone the school default set into a class, creating its override schedule.
     *
     * @return Collection<int, PeriodSlot>
     */
    public function copyDefaultInto(int $classId): Collection
    {
        return DB::transaction(function () use ($classId) {
            foreach ($this->defaultSlots() as $slot) {
                PeriodSlot::create([
                    'class_id' => $classId,
                    'name' => $slot->name,
                    'sequence' => $slot->sequence,
                    'start_time' => $slot->start_time,
                    'end_time' => $slot->end_time,
                    'is_break' => $slot->is_break,
                    'status' => $slot->status,
                ]);
            }

            return $this->effectiveSlotsForClass($classId);
        });
    }

    /**
     * Remove a class override, reverting it to the school default.
     */
    public function removeClassSchedule(int $classId): void
    {
        PeriodSlot::query()->where('class_id', $classId)->delete();
    }
}
