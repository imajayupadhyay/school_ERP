<?php

namespace App\Http\Resources\Notices;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class NoticeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $recipientCount = (int) ($this->recipient_count ?? 0);
        $readCount = (int) ($this->reads_count ?? 0);

        return [
            'id' => $this->id,
            'created_by' => $this->created_by,
            'published_by' => $this->published_by,
            'title' => $this->title,
            'body' => $this->body,
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => $this->status,
            'delivery_status' => $this->delivery_status,
            'publish_at' => $this->publish_at?->toISOString(),
            'published_at' => $this->published_at?->toISOString(),
            'expires_at' => $this->expires_at?->toISOString(),
            'attachment_path' => $this->attachment_path,
            'attachment_url' => $this->attachment_path ? Storage::disk('public')->url($this->attachment_path) : null,
            'read_count' => $readCount,
            'recipient_count' => $recipientCount,
            'read_percentage' => $recipientCount > 0 ? round(($readCount / $recipientCount) * 100, 1) : 0,
            'is_read' => (bool) ($this->is_read ?? false),
            'targets' => $this->whenLoaded('targets', fn () => $this->targets->map(fn ($target) => [
                'id' => $target->id,
                'type' => $target->target_type,
                'target_id' => $target->target_id,
                'value' => $target->target_value,
                'label' => $target->target_label,
            ])->values()),
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ] : null),
            'publisher' => $this->whenLoaded('publisher', fn () => $this->publisher ? [
                'id' => $this->publisher->id,
                'name' => $this->publisher->name,
                'email' => $this->publisher->email,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
