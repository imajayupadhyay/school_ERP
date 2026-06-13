<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnquiryResource;
use App\Models\Enquiry;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Platform Super Admin management of marketing enquiries (sales leads).
 * Behind the `platform.admin` middleware.
 */
class EnquiryController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));

        $enquiries = Enquiry::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => EnquiryResource::collection($enquiries->getCollection()),
            'meta' => [
                'current_page' => $enquiries->currentPage(),
                'from' => $enquiries->firstItem(),
                'last_page' => $enquiries->lastPage(),
                'per_page' => $enquiries->perPage(),
                'to' => $enquiries->lastItem(),
                'total' => $enquiries->total(),
                'new_count' => Enquiry::where('status', 'new')->count(),
            ],
        ]);
    }

    public function updateStatus(Request $request, Enquiry $enquiry): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Enquiry::STATUSES)],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $old = $enquiry->status;
        $enquiry->update($validated);

        if ($old !== $enquiry->status) {
            $this->auditLogger->log(
                school: null,
                user: $request->user(),
                action: 'enquiry.status_changed',
                changes: ['status' => ['old' => $old, 'new' => $enquiry->status]],
                auditable: $enquiry,
                ipAddress: $request->ip(),
            );
        }

        return $this->ok(new EnquiryResource($enquiry), 'Enquiry updated.');
    }

    public function destroy(Request $request, Enquiry $enquiry): JsonResponse
    {
        $snapshot = ['name' => $enquiry->name, 'email' => $enquiry->email];
        $enquiry->delete();

        $this->auditLogger->log(
            school: null,
            user: $request->user(),
            action: 'enquiry.deleted',
            changes: [
                'name' => ['old' => $snapshot['name'], 'new' => null],
                'email' => ['old' => $snapshot['email'], 'new' => null],
            ],
            ipAddress: $request->ip(),
        );

        return $this->ok(null, 'Enquiry deleted.');
    }
}
