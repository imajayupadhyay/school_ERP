<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Controllers\Controller;
use App\Http\Requests\Students\PromoteStudentsRequest;
use App\Http\Requests\Students\StudentRequest;
use App\Http\Requests\Students\TransferStudentRequest;
use App\Http\Resources\Students\StudentResource;
use App\Models\AuditLog;
use App\Models\Student;
use App\Services\StudentService;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly StudentService $studentService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 5), 50);
        $search = trim((string) $request->query('search', ''));

        $students = $this->studentQuery($request)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('admission_no', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('roll_no', 'like', "%{$search}%")
                        ->orWhere('guardian_name', 'like', "%{$search}%")
                        ->orWhere('guardian_phone', 'like', "%{$search}%")
                        ->orWhere('primary_phone', 'like', "%{$search}%");
                });
            })
            ->orderBy('class_name')
            ->orderBy('section')
            ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
            ->orderBy('first_name')
            ->paginate($perPage)
            ->withQueryString();

        return $this->ok([
            'items' => StudentResource::collection($students->getCollection()),
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

    public function export(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        $students = $this->studentQuery($request)
            ->orderBy('class_name')
            ->orderBy('section')
            ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
            ->orderBy('first_name')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="students.csv"',
        ];

        return response()->streamDownload(function () use ($students) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Admission No',
                'Name',
                'Gender',
                'Date of Birth',
                'Class',
                'Section',
                'Roll No',
                'House',
                'Category',
                'Guardian',
                'Guardian Phone',
                'Status',
                'Admission Date',
            ]);

            foreach ($students as $student) {
                fputcsv($handle, [
                    $student->admission_no,
                    $student->full_name,
                    $student->gender,
                    $student->date_of_birth?->toDateString(),
                    $student->class_name,
                    $student->section,
                    $student->roll_no,
                    $student->house,
                    $student->category,
                    $student->guardian_name,
                    $student->guardian_phone,
                    $student->status,
                    $student->admission_date?->toDateString(),
                ]);
            }

            fclose($handle);
        }, 'students.csv', $headers);
    }

    public function store(StudentRequest $request): JsonResponse
    {
        $student = DB::transaction(function () use ($request) {
            $schoolId = $request->user()->school_id;
            $payload = $this->studentService->studentPayload($request->validated(), $schoolId);
            $student = Student::create($payload)->refresh();

            $this->studentService->syncGuardians($student, $request->validated('guardians'));

            $this->auditLogger->log(
                school: $student->school,
                user: $request->user(),
                action: 'student.created',
                changes: $payload,
                auditable: $student,
                ipAddress: $request->ip(),
            );

            return $student;
        });

        return $this->created(
            new StudentResource($student->load($this->studentRelations())),
            'Student created.',
        );
    }

    public function show(Student $student): JsonResponse
    {
        return $this->ok(new StudentResource($student->load($this->studentRelations())));
    }

    public function update(StudentRequest $request, Student $student): JsonResponse
    {
        $student = DB::transaction(function () use ($request, $student) {
            $payload = $this->studentService->studentPayload($request->validated(), $student->school_id, $student);
            $original = $student->only(array_keys($payload));

            $student->update($payload);
            $this->studentService->syncGuardians($student, $request->validated('guardians'));
            $student->refresh();

            $changes = $this->auditLogger->diff($original, $student->only(array_keys($payload)));

            if ($changes !== []) {
                $this->auditLogger->log(
                    school: $student->school,
                    user: $request->user(),
                    action: 'student.updated',
                    changes: $changes,
                    auditable: $student,
                    ipAddress: $request->ip(),
                );
            }

            return $student;
        });

        return $this->ok(
            new StudentResource($student->load($this->studentRelations())),
            'Student updated.',
        );
    }

    public function destroy(Request $request, Student $student): JsonResponse
    {
        $user = $request->user();

        $original = $student->only(['status']);
        $student->update(['status' => 'archived']);

        $this->auditLogger->log(
            school: $student->school,
            user: $user,
            action: 'student.archived',
            changes: $this->auditLogger->diff($original, $student->only(['status'])),
            auditable: $student,
            ipAddress: $request->ip(),
        );

        return $this->ok(new StudentResource($student->load($this->studentRelations())), 'Student archived.');
    }

    public function transfer(TransferStudentRequest $request, Student $student): JsonResponse
    {
        $payload = $this->studentService->transferPayload($student, $request->validated());
        $original = $student->only(array_keys($payload));

        $student->update($payload);

        $this->auditLogger->log(
            school: $student->school,
            user: $request->user(),
            action: $request->validated('transfer_type') === 'outgoing' ? 'student.transferred_out' : 'student.internal_transfer',
            changes: $this->auditLogger->diff($original, $student->only(array_keys($payload))),
            auditable: $student,
            ipAddress: $request->ip(),
        );

        return $this->ok(
            new StudentResource($student->load($this->studentRelations())),
            'Student transfer updated.',
        );
    }

    public function promote(PromoteStudentsRequest $request): JsonResponse
    {
        $result = $this->studentService->promote($request->validated(), $request->user()->school_id);

        $this->auditLogger->log(
            school: $request->user()->school,
            user: $request->user(),
            action: 'student.promoted',
            changes: [
                ...$request->validated(),
                'promoted_count' => $result['count'],
                'student_ids' => $result['student_ids'],
            ],
            ipAddress: $request->ip(),
        );

        return $this->ok($result, "{$result['count']} students promoted.");
    }

    public function uploadPhoto(Request $request, Student $student): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($student->photo_path) {
            Storage::disk('public')->delete($student->photo_path);
        }

        $oldPath = $student->photo_path;
        $path = $request->file('photo')->store("schools/{$student->school_id}/students/{$student->id}", 'public');
        $student->update(['photo_path' => $path]);

        $this->auditLogger->log(
            school: $student->school,
            user: $user,
            action: 'student.photo_updated',
            changes: ['photo_path' => ['old' => $oldPath, 'new' => $path]],
            auditable: $student,
            ipAddress: $request->ip(),
        );

        return $this->ok(new StudentResource($student->load($this->studentRelations())), 'Student photo updated.');
    }

    public function history(Student $student): JsonResponse
    {
        $history = AuditLog::where('school_id', $student->school_id)
            ->where('auditable_type', $student->getMorphClass())
            ->where('auditable_id', $student->id)
            ->with('user:id,name,email')
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'changes' => $log->changes,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'created_at' => $log->created_at?->toISOString(),
            ]);

        return $this->ok($history);
    }

    /**
     * @return array<int, string>
     */
    private function studentRelations(): array
    {
        return ['academicSession', 'schoolClass', 'schoolSection', 'guardians'];
    }

    private function studentQuery(Request $request)
    {
        return Student::with($this->studentRelations())
            ->when($request->filled('academic_session_id'), fn ($query) => $query->where('academic_session_id', $request->integer('academic_session_id')))
            ->when($request->filled('class_id'), fn ($query) => $query->where('class_id', $request->integer('class_id')))
            ->when($request->filled('section_id'), fn ($query) => $query->where('section_id', $request->integer('section_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->when($request->filled('gender'), fn ($query) => $query->where('gender', $request->query('gender')))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->query('category')));
    }
}
