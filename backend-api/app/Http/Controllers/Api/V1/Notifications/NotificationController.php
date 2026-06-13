<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Http\Controllers\Controller;
use App\Services\Notifications\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * In-app notification bell. Available to any authenticated user; the feed is
 * permission-filtered internally, so there is no route-level permission gate.
 */
class NotificationController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * The notification feed (recent items + unread count).
     */
    public function index(Request $request): JsonResponse
    {
        $feed = $this->notifications->feed($request->user());

        return response()->json([
            'data' => $feed['items'],
            'meta' => ['unread_count' => $feed['unread_count']],
        ]);
    }

    /**
     * Lightweight unread count for polling.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return $this->ok(['count' => $this->notifications->unreadCount($request->user())]);
    }

    /**
     * Mark all notifications as seen (resets the unread badge).
     */
    public function markSeen(Request $request): JsonResponse
    {
        $seenAt = $this->notifications->markSeen($request->user());

        return $this->ok(['seen_at' => $seenAt->toIso8601String()], 'Notifications marked as seen.');
    }
}
