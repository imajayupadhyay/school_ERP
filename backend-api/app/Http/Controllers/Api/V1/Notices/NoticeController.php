<?php

namespace App\Http\Controllers\Api\V1\Notices;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notices\NoticeRequest;
use App\Http\Resources\Notices\NoticeResource;
use App\Models\Notice;
use App\Models\NoticeRead;
use App\Models\User;
use App\Services\NoticeService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class NoticeController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly NoticeService $noticeService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));
        $user = $request->user();

        $query = Notice::query()
            ->with(['targets', 'creator', 'publisher'])
            ->withCount('reads')
            ->withExists(['reads as is_read' => fn (Builder $read) => $read->where('user_id', $user->id)])
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $inner) use ($search) {
                    $inner
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('body', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('category'), fn (Builder $q) => $q->where('category', $request->query('category')))
            ->when($request->filled('priority'), fn (Builder $q) => $q->where('priority', $request->query('priority')))
            ->when($request->filled('status'), fn (Builder $q) => $q->where('status', $request->query('status')))
            ->when($request->filled('target_type'), fn (Builder $q) => $q->whereHas(
                'targets',
                fn (Builder $target) => $target->where('target_type', $request->query('target_type')),
            ))
            ->when($request->filled('class_id'), fn (Builder $q) => $q->whereHas(
                'targets',
                fn (Builder $target) => $target
                    ->where('target_type', 'class')
                    ->where('target_id', $request->integer('class_id')),
            ));

        $this->noticeService->applyVisibleScope($query, $user);

        $notices = $query
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END")
            ->orderByDesc('publish_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $notices->getCollection()->each(function (Notice $notice) {
            $notice->setAttribute('recipient_count', $this->noticeService->recipientUserIds($notice)->count());
        });

        return $this->ok([
            'items' => NoticeResource::collection($notices->getCollection()),
            'meta' => [
                'current_page' => $notices->currentPage(),
                'from' => $notices->firstItem(),
                'last_page' => $notices->lastPage(),
                'per_page' => $notices->perPage(),
                'to' => $notices->lastItem(),
                'total' => $notices->total(),
            ],
        ]);
    }

    public function store(NoticeRequest $request): JsonResponse
    {
        if (! $this->noticeService->isManager($request->user())) {
            return $this->fail('You do not have permission to create notices.', 403);
        }

        $validated = $request->validated();

        $notice = DB::transaction(function () use ($validated, $request) {
            $notice = Notice::create($this->noticeService->payload($validated, $request->user()))->refresh();
            $this->noticeService->syncTargets($notice, $validated['targets']);

            return $notice;
        });

        $this->auditLogger->log(
            school: $notice->school,
            user: $request->user(),
            action: 'notice.created',
            changes: [
                ...$notice->only(['title', 'category', 'priority', 'status', 'publish_at', 'expires_at']),
                'targets' => $validated['targets'],
            ],
            auditable: $notice,
            ipAddress: $request->ip(),
        );

        return $this->created($this->resource($notice, $request), 'Notice created.');
    }

    public function show(Request $request, Notice $notice): JsonResponse
    {
        if (! $this->noticeService->canView($request->user(), $notice)) {
            return $this->fail('You do not have permission to view this notice.', 403);
        }

        return $this->ok($this->resource($notice, $request));
    }

    public function update(NoticeRequest $request, Notice $notice): JsonResponse
    {
        if (! $this->noticeService->isManager($request->user())) {
            return $this->fail('You do not have permission to update notices.', 403);
        }

        $validated = $request->validated();
        $payload = $this->noticeService->payload($validated, $request->user(), $notice);
        $original = [
            ...$notice->only(array_keys($payload)),
            'targets' => $notice->targets()->get(['target_type', 'target_id', 'target_value'])->toArray(),
        ];

        DB::transaction(function () use ($notice, $payload, $validated) {
            $notice->update($payload);
            $this->noticeService->syncTargets($notice, $validated['targets']);
        });
        $notice->refresh();

        $updated = [
            ...$notice->only(array_keys($payload)),
            'targets' => $validated['targets'],
        ];
        $changes = $this->auditLogger->diff($original, $updated);

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $notice->school,
                user: $request->user(),
                action: 'notice.updated',
                changes: $changes,
                auditable: $notice,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok($this->resource($notice, $request), 'Notice updated.');
    }

    public function destroy(Request $request, Notice $notice): JsonResponse
    {
        if (! $this->noticeService->isManager($request->user())) {
            return $this->fail('You do not have permission to archive notices.', 403);
        }

        $original = $notice->only(['status', 'published_at', 'published_by']);
        $notice->update([
            'status' => 'archived',
            'published_at' => null,
            'published_by' => null,
        ]);

        $this->auditLogger->log(
            school: $notice->school,
            user: $request->user(),
            action: 'notice.archived',
            changes: $this->auditLogger->diff($original, $notice->only(['status', 'published_at', 'published_by'])),
            auditable: $notice,
            ipAddress: $request->ip(),
        );

        return $this->ok($this->resource($notice, $request), 'Notice archived.');
    }

    public function uploadAttachment(Request $request, Notice $notice): JsonResponse
    {
        if (! $this->noticeService->isManager($request->user())) {
            return $this->fail('You do not have permission to upload notice attachments.', 403);
        }

        $request->validate([
            'attachment' => ['required', 'file', 'mimes:pdf,doc,docx,jpg,jpeg,png,webp', 'max:10240'],
        ]);

        if ($notice->attachment_path) {
            Storage::disk('public')->delete($notice->attachment_path);
        }

        $oldPath = $notice->attachment_path;
        $path = $request->file('attachment')->store("schools/{$notice->school_id}/notices/{$notice->id}", 'public');
        $notice->update(['attachment_path' => $path]);

        $this->auditLogger->log(
            school: $notice->school,
            user: $request->user(),
            action: 'notice.attachment_uploaded',
            changes: ['attachment_path' => ['old' => $oldPath, 'new' => $path]],
            auditable: $notice,
            ipAddress: $request->ip(),
        );

        return $this->ok($this->resource($notice, $request), 'Notice attachment uploaded.');
    }

    public function markRead(Request $request, Notice $notice): JsonResponse
    {
        if (! $this->noticeService->canView($request->user(), $notice)) {
            return $this->fail('You do not have permission to read this notice.', 403);
        }

        $read = NoticeRead::updateOrCreate(
            ['notice_id' => $notice->id, 'user_id' => $request->user()->id],
            ['school_id' => $notice->school_id, 'read_at' => now()],
        );

        return $this->ok([
            'notice_id' => $notice->id,
            'read_at' => $read->read_at?->toISOString(),
        ], 'Notice marked as read.');
    }

    public function delivery(Request $request, Notice $notice): JsonResponse
    {
        if (! $this->noticeService->isManager($request->user())) {
            return $this->fail('You do not have permission to view notice delivery.', 403);
        }

        $recipientIds = $this->noticeService->recipientUserIds($notice);
        $reads = NoticeRead::query()
            ->where('notice_id', $notice->id)
            ->whereIn('user_id', $recipientIds)
            ->get()
            ->keyBy('user_id');
        $recipients = User::query()
            ->whereIn('id', $recipientIds)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'read_at' => $reads->get($user->id)?->read_at?->toISOString(),
            ])
            ->values();

        return $this->ok([
            'notice_id' => $notice->id,
            'recipient_count' => $recipients->count(),
            'read_count' => $reads->count(),
            'unread_count' => max($recipients->count() - $reads->count(), 0),
            'recipients' => $recipients,
        ]);
    }

    private function resource(Notice $notice, Request $request): NoticeResource
    {
        $notice->load(['targets', 'creator', 'publisher'])->loadCount('reads');
        $notice->setAttribute('recipient_count', $this->noticeService->recipientUserIds($notice)->count());
        $notice->setAttribute(
            'is_read',
            $notice->reads()->where('user_id', $request->user()->id)->exists(),
        );

        return new NoticeResource($notice);
    }
}
