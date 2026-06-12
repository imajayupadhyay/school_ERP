<?php

namespace App\Http\Resources\Reports;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $changes = $this->changes ?? [];

        return [
            'id' => $this->id,
            'action' => $this->action,
            'module' => Str::before($this->action, '.'),
            'action_label' => $this->actionLabel($this->action),
            'actor' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ] : null),
            'auditable' => [
                'type' => $this->auditable_type ? class_basename($this->auditable_type) : null,
                'id' => $this->auditable_id,
            ],
            'changed_fields' => array_values(array_keys($changes)),
            'changes_count' => count($changes),
            'changes' => $changes,
            'ip_address' => $this->ip_address,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    private function actionLabel(string $action): string
    {
        return Str::of($action)
            ->replace(['_', '.'], ' ')
            ->title()
            ->toString();
    }
}
