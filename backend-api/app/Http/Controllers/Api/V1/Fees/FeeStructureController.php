<?php

namespace App\Http\Controllers\Api\V1\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeeStructureRequest;
use App\Http\Resources\Fees\FeeStructureResource;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeeStructureController extends Controller
{
    use ApiResponse;

    private const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin'];

    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $structures = FeeStructure::query()
            ->with(['academicSession', 'schoolClass'])
            ->withCount('items')
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when($request->filled('academic_session_id'), fn ($query) => $query->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('class_id'), fn ($query) => $query->where('class_id', $request->integer('class_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->orderBy('name')
            ->get();

        return $this->ok(FeeStructureResource::collection($structures));
    }

    public function store(FeeStructureRequest $request): JsonResponse
    {
        $structure = DB::transaction(function () use ($request) {
            $structure = FeeStructure::create(collect($request->validated())->except('items')->all());
            $this->syncItems($structure, $request->validated('items'));

            $this->auditLogger->log(
                school: $structure->school,
                user: $request->user(),
                action: 'fee_structure.created',
                changes: $request->validated(),
                auditable: $structure,
                ipAddress: $request->ip(),
            );

            return $structure;
        });

        return $this->created(
            new FeeStructureResource($structure->load($this->relations())),
            'Fee structure created.',
        );
    }

    public function show(FeeStructure $feeStructure): JsonResponse
    {
        return $this->ok(new FeeStructureResource($feeStructure->load($this->relations())));
    }

    public function update(FeeStructureRequest $request, FeeStructure $feeStructure): JsonResponse
    {
        $structure = DB::transaction(function () use ($request, $feeStructure) {
            $attributes = collect($request->validated())->except('items')->all();
            $original = $feeStructure->only(array_keys($attributes));

            $feeStructure->update($attributes);
            $this->syncItems($feeStructure, $request->validated('items'));

            $changes = $this->auditLogger->diff($original, $feeStructure->only(array_keys($attributes)));
            $changes['items'] = ['new' => $request->validated('items')];

            $this->auditLogger->log(
                school: $feeStructure->school,
                user: $request->user(),
                action: 'fee_structure.updated',
                changes: $changes,
                auditable: $feeStructure,
                ipAddress: $request->ip(),
            );

            return $feeStructure;
        });

        return $this->ok(
            new FeeStructureResource($structure->load($this->relations())),
            'Fee structure updated.',
        );
    }

    public function destroy(Request $request, FeeStructure $feeStructure): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role, self::EDITOR_ROLES, true)) {
            return $this->fail('You do not have permission to delete fee structures.', 403);
        }

        DB::transaction(function () use ($feeStructure, $user, $request) {
            $feeStructure->items()->delete();
            $feeStructure->delete();

            $this->auditLogger->log(
                school: $feeStructure->school,
                user: $user,
                action: 'fee_structure.deleted',
                changes: ['id' => $feeStructure->id, 'name' => $feeStructure->name],
                auditable: $feeStructure,
                ipAddress: $request->ip(),
            );
        });

        return $this->ok(null, 'Fee structure deleted.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(FeeStructure $structure, array $items): void
    {
        $structure->items()->delete();

        foreach ($items as $item) {
            FeeStructureItem::create([
                'school_id' => $structure->school_id,
                'fee_structure_id' => $structure->id,
                'fee_head_id' => $item['fee_head_id'],
                'amount' => $item['amount'],
                'frequency' => $item['frequency'],
                'is_optional' => (bool) ($item['is_optional'] ?? false),
            ]);
        }
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['academicSession', 'schoolClass', 'items.feeHead'];
    }
}
