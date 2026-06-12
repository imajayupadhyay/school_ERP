<?php

namespace App\Http\Controllers\Api\V1\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeeHeadRequest;
use App\Http\Resources\Fees\FeeHeadResource;
use App\Models\FeeHead;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeHeadController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $feeHeads = FeeHead::query()
            ->when($search !== '', fn ($query) => $query->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->orderBy('name')
            ->get();

        return $this->ok(FeeHeadResource::collection($feeHeads));
    }

    public function store(FeeHeadRequest $request): JsonResponse
    {
        $feeHead = FeeHead::create($request->validated());

        $this->auditLogger->log(
            school: $feeHead->school,
            user: $request->user(),
            action: 'fee_head.created',
            changes: $request->validated(),
            auditable: $feeHead,
            ipAddress: $request->ip(),
        );

        return $this->created(new FeeHeadResource($feeHead), 'Fee head created.');
    }

    public function show(FeeHead $feeHead): JsonResponse
    {
        return $this->ok(new FeeHeadResource($feeHead));
    }

    public function update(FeeHeadRequest $request, FeeHead $feeHead): JsonResponse
    {
        $original = $feeHead->only(array_keys($request->validated()));
        $feeHead->update($request->validated());

        $changes = $this->auditLogger->diff($original, $feeHead->only(array_keys($request->validated())));

        if ($changes !== []) {
            $this->auditLogger->log(
                school: $feeHead->school,
                user: $request->user(),
                action: 'fee_head.updated',
                changes: $changes,
                auditable: $feeHead,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new FeeHeadResource($feeHead), 'Fee head updated.');
    }

    public function destroy(Request $request, FeeHead $feeHead): JsonResponse
    {
        $user = $request->user();

        $feeHead->delete();

        $this->auditLogger->log(
            school: $feeHead->school,
            user: $user,
            action: 'fee_head.deleted',
            changes: ['id' => $feeHead->id, 'name' => $feeHead->name],
            auditable: $feeHead,
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Fee head deleted.');
    }
}
