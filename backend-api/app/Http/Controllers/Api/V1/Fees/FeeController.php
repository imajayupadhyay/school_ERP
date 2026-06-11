<?php

namespace App\Http\Controllers\Api\V1\Fees;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeController extends Controller
{
    use ApiResponse;

    /**
     * Collections roster: students with their fee status (billed / paid /
     * outstanding / overdue) for the operational fee-collection screen.
     */
    public function studentsIndex(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));
        $today = now()->toDateString();

        $students = Student::query()
            ->with(['schoolClass', 'schoolSection'])
            ->withSum(['feeInvoices as billed_amount' => fn ($q) => $q->where('status', '!=', 'cancelled')], 'total_amount')
            ->withSum(['feeInvoices as collected_amount' => fn ($q) => $q->where('status', '!=', 'cancelled')], 'paid_amount')
            ->withCount(['feeInvoices as overdue_count' => fn ($q) => $q->whereIn('status', ['pending', 'partial'])->whereDate('due_date', '<', $today)])
            ->withCount(['feeAssignments as active_plan_count' => fn ($q) => $q->where('status', 'active')])
            ->when($search !== '', fn ($query) => $query->where(function ($inner) use ($search) {
                $inner->where('admission_no', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('roll_no', 'like', "%{$search}%");
            }))
            ->when($request->filled('academic_session_id'), fn ($query) => $query->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('class_id'), fn ($query) => $query->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn ($query) => $query->where('section_id', $request->integer('section_id')))
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->query('status')),
                fn ($query) => $query->where('status', '!=', 'archived'),
            )
            ->orderBy('class_name')
            ->orderBy('section')
            ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
            ->orderBy('first_name')
            ->paginate($perPage)
            ->withQueryString();

        $items = $students->getCollection()->map(function (Student $student) {
            $billed = round((float) ($student->billed_amount ?? 0), 2);
            $collected = round((float) ($student->collected_amount ?? 0), 2);

            return [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'full_name' => $student->full_name,
                'class_name' => $student->class_name,
                'section' => $student->section,
                'class_id' => $student->class_id,
                'section_id' => $student->section_id,
                'status' => $student->status,
                'has_plan' => (int) $student->active_plan_count > 0,
                'billed' => $billed,
                'paid' => $collected,
                'outstanding' => round($billed - $collected, 2),
                'overdue_count' => (int) $student->overdue_count,
            ];
        });

        return $this->ok([
            'items' => $items,
            'meta' => [
                'current_page' => $students->currentPage(),
                'from' => $students->firstItem(),
                'last_page' => $students->lastPage(),
                'per_page' => $students->perPage(),
                'to' => $students->lastItem(),
                'total' => $students->total(),
            ],
        ]);
    }
}
