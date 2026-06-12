<?php

namespace App\Http\Controllers\Api\V1\Timetables;

use App\Http\Controllers\Controller;
use App\Http\Requests\Timetables\TimetableEntryRequest;
use App\Http\Requests\Timetables\TimetableRequest;
use App\Http\Resources\Timetables\TimetableResource;
use App\Models\Employee;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Services\Timetables\TimetableAccessService;
use App\Services\Timetables\TimetableConflictService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TimetableController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly TimetableAccessService $accessService,
        private readonly TimetableConflictService $conflictService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Timetable::query()
            ->with(['academicSession', 'schoolClass', 'section'])
            ->withCount('entries')
            ->when($request->filled('academic_session_id'), fn (Builder $q) => $q->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('class_id'), fn (Builder $q) => $q->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn (Builder $q) => $q->where('section_id', $request->integer('section_id')));

        $this->accessService->applyVisibleScope($query, $request->user());

        $timetables = $query->orderByDesc('id')->get();

        return $this->ok(TimetableResource::collection($timetables));
    }

    public function store(TimetableRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['status'] = 'draft';

        $timetable = Timetable::create($payload)->refresh();

        $this->auditLogger->log(
            school: $timetable->school,
            user: $request->user(),
            action: 'timetable.created',
            changes: $payload,
            auditable: $timetable,
            ipAddress: $request->ip(),
        );

        return $this->created(
            new TimetableResource($timetable->load(['academicSession', 'schoolClass', 'section'])),
            'Timetable created.',
        );
    }

    public function show(Request $request, Timetable $timetable): JsonResponse
    {
        if (! $this->accessService->canView($request->user(), $timetable)) {
            return $this->fail('You do not have permission to view this timetable.', 403);
        }

        $timetable->load([
            'academicSession',
            'schoolClass',
            'section',
            'entries.subject',
            'entries.employee',
            'entries.periodSlot',
        ]);

        return $this->ok(new TimetableResource($timetable));
    }

    public function updateEntries(TimetableEntryRequest $request, Timetable $timetable): JsonResponse
    {
        $entries = $request->validated()['entries'];

        $clashes = $this->conflictService->detect($timetable, $entries);
        if ($clashes !== []) {
            return $this->fail(
                'Some teachers are double-booked. Resolve the clashes and try again.',
                422,
                $this->conflictService->toValidationErrors($clashes),
            );
        }

        DB::transaction(function () use ($timetable, $entries) {
            $timetable->entries()->delete();

            foreach ($entries as $entry) {
                $timetable->entries()->create([
                    'school_id' => $timetable->school_id,
                    'day_of_week' => $entry['day_of_week'],
                    'period_slot_id' => $entry['period_slot_id'],
                    'subject_id' => $entry['subject_id'],
                    'employee_id' => $entry['employee_id'],
                ]);
            }
        });

        $this->auditLogger->log(
            school: $timetable->school,
            user: $request->user(),
            action: 'timetable.entries_updated',
            changes: ['entries_count' => ['old' => null, 'new' => count($entries)]],
            auditable: $timetable,
            ipAddress: $request->ip(),
        );

        $timetable->load([
            'academicSession',
            'schoolClass',
            'section',
            'entries.subject',
            'entries.employee',
            'entries.periodSlot',
        ]);

        return $this->ok(new TimetableResource($timetable), 'Timetable saved.');
    }

    public function publish(Request $request, Timetable $timetable): JsonResponse
    {
        $timetable->update(['status' => 'published', 'published_at' => now()]);

        $this->auditLogger->log(
            school: $timetable->school,
            user: $request->user(),
            action: 'timetable.published',
            changes: ['status' => ['old' => 'draft', 'new' => 'published']],
            auditable: $timetable,
            ipAddress: $request->ip(),
        );

        return $this->ok(
            new TimetableResource($timetable->load(['academicSession', 'schoolClass', 'section'])),
            'Timetable published.',
        );
    }

    public function unpublish(Request $request, Timetable $timetable): JsonResponse
    {
        $timetable->update(['status' => 'draft', 'published_at' => null]);

        $this->auditLogger->log(
            school: $timetable->school,
            user: $request->user(),
            action: 'timetable.unpublished',
            changes: ['status' => ['old' => 'published', 'new' => 'draft']],
            auditable: $timetable,
            ipAddress: $request->ip(),
        );

        return $this->ok(
            new TimetableResource($timetable->load(['academicSession', 'schoolClass', 'section'])),
            'Timetable moved back to draft.',
        );
    }

    public function destroy(Request $request, Timetable $timetable): JsonResponse
    {
        $this->auditLogger->log(
            school: $timetable->school,
            user: $request->user(),
            action: 'timetable.deleted',
            changes: ['status' => ['old' => $timetable->status, 'new' => null]],
            auditable: $timetable,
            ipAddress: $request->ip(),
        );

        $timetable->delete();

        return $this->ok(null, 'Timetable deleted.');
    }

    /**
     * Read-only weekly schedule for one teacher, assembled from their entries
     * across every class-section timetable. Teachers may only view their own.
     */
    public function teacher(Request $request, Employee $employee): JsonResponse
    {
        $user = $request->user();
        $isManager = $this->accessService->isManager($user);

        if (! $isManager && $employee->user_id !== $user->id) {
            return $this->fail('You can only view your own timetable.', 403);
        }

        $query = TimetableEntry::query()
            ->where('employee_id', $employee->id)
            ->with(['subject', 'periodSlot', 'timetable.schoolClass', 'timetable.section', 'timetable.academicSession'])
            ->whereHas('timetable', function (Builder $q) use ($request, $isManager) {
                if (! $isManager) {
                    $q->where('status', 'published');
                }
                if ($request->filled('academic_session_id')) {
                    $q->where('academic_session_id', $request->integer('academic_session_id'));
                }
            });

        $entries = $query->get()->map(fn (TimetableEntry $entry) => [
            'id' => $entry->id,
            'day_of_week' => $entry->day_of_week,
            'period_slot_id' => $entry->period_slot_id,
            'period_slot' => $entry->periodSlot ? [
                'id' => $entry->periodSlot->id,
                'name' => $entry->periodSlot->name,
                'sequence' => $entry->periodSlot->sequence,
                'start_time' => $entry->periodSlot->start_time ? substr((string) $entry->periodSlot->start_time, 0, 5) : null,
                'end_time' => $entry->periodSlot->end_time ? substr((string) $entry->periodSlot->end_time, 0, 5) : null,
            ] : null,
            'subject' => $entry->subject ? ['id' => $entry->subject->id, 'name' => $entry->subject->name] : null,
            'class_name' => $entry->timetable?->schoolClass?->name,
            'section_name' => $entry->timetable?->section?->name,
            'status' => $entry->timetable?->status,
        ])->values();

        return $this->ok([
            'employee' => ['id' => $employee->id, 'name' => $employee->full_name],
            'entries' => $entries,
        ]);
    }
}
