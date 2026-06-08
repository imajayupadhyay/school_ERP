<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Consistent JSON envelope for the whole API.
 * Success:  { "data": ..., "message"?: ... }
 * Error:    { "message": ..., "errors"?: ... }
 *
 * Mirrors Laravel's native validation error shape so clients only learn one format.
 */
trait ApiResponse
{
    protected function ok(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        $payload = ['data' => $data];

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload, $status);
    }

    protected function created(mixed $data = null, ?string $message = null): JsonResponse
    {
        return $this->ok($data, $message, 201);
    }

    /**
     * @param  array<string, array<int, string>>  $errors
     */
    protected function fail(string $message, int $status = 400, array $errors = []): JsonResponse
    {
        $payload = ['message' => $message];

        if ($errors !== []) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
