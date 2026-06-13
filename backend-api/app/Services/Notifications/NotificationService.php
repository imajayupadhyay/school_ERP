<?php

namespace App\Services\Notifications;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Builds the in-app notification feed for the bell from the audit log.
 *
 * Notifications are "things other people / the system did in your school that
 * you should know about". The audit log already records every important action
 * across every module, so the bell reads from it — no module needs to emit
 * notifications separately, and nothing can be forgotten.
 *
 * Scoping rules (all enforced here):
 *  - tenant: AuditLog uses the BelongsToSchool global scope, so only the
 *    authenticated user's school is ever queried.
 *  - relevance: only audit actions present in config('notifications.events').
 *  - permission: the recipient must hold the action's permission key (owners
 *    hold everything), so a librarian never sees fee notifications.
 *  - authorship: a user is not notified about their own actions.
 */
class NotificationService
{
    private const FEED_LIMIT = 15;

    private const COUNT_CAP = 99;

    /**
     * The notification feed (most recent first) plus the unread count.
     *
     * @return array{items: array<int, array<string, mixed>>, unread_count: int}
     */
    public function feed(User $user, int $limit = self::FEED_LIMIT): array
    {
        $events = $this->visibleEvents($user);

        if ($events === []) {
            return ['items' => [], 'unread_count' => 0];
        }

        $seenAt = $user->notifications_seen_at;

        $logs = $this->baseQuery($user, array_keys($events))
            ->with('user:id,name')
            ->latest('created_at')
            ->limit($limit)
            ->get();

        $items = $logs->map(function (AuditLog $log) use ($events, $seenAt) {
            $event = $events[$log->action];

            return [
                'id' => $log->id,
                'action' => $log->action,
                'category' => $event['category'],
                'title' => $event['title'],
                'actor' => $log->user?->name ?? 'System',
                'route' => $event['route'],
                'created_at' => $log->created_at?->toIso8601String(),
                'read' => $seenAt !== null && $log->created_at !== null
                    && $log->created_at->lessThanOrEqualTo($seenAt),
            ];
        })->all();

        return [
            'items' => $items,
            'unread_count' => $this->unreadCount($user),
        ];
    }

    /**
     * How many unread notifications the user has (capped for display).
     */
    public function unreadCount(User $user): int
    {
        $events = $this->visibleEvents($user);

        if ($events === []) {
            return 0;
        }

        $query = $this->baseQuery($user, array_keys($events));

        if ($user->notifications_seen_at !== null) {
            $query->where('created_at', '>', $user->notifications_seen_at);
        }

        return min($query->count(), self::COUNT_CAP);
    }

    /**
     * Mark everything up to now as seen (clears the unread badge).
     */
    public function markSeen(User $user): Carbon
    {
        $now = Carbon::now();
        $user->notifications_seen_at = $now;
        $user->save();

        return $now;
    }

    /**
     * Registry entries the user is allowed to be notified about.
     *
     * @return array<string, array<string, string>>
     */
    private function visibleEvents(User $user): array
    {
        /** @var array<string, array<string, string>> $registry */
        $registry = config('notifications.events', []);

        return array_filter($registry, function (array $event) use ($user) {
            $permission = $event['permission'] ?? null;

            return $permission === null || $user->hasPermission($permission);
        });
    }

    /**
     * Notifiable audit logs for this user: relevant actions, not their own
     * (system/null-actor events are kept).
     *
     * @param  array<int, string>  $actions
     * @return Builder<AuditLog>
     */
    private function baseQuery(User $user, array $actions): Builder
    {
        return AuditLog::query()
            ->whereIn('action', $actions)
            ->where(function (Builder $query) use ($user) {
                $query->whereNull('user_id')->orWhere('user_id', '!=', $user->id);
            });
    }
}
