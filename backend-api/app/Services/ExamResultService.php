<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamResult;
use App\Models\ExamResultItem;
use App\Models\ExamSchedule;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExamResultService
{
    /**
     * @param  array<string, mixed>  $validated
     */
    public function saveMarks(ExamSchedule $schedule, array $validated, User $user): ExamSchedule
    {
        $publishedExists = ExamResult::query()
            ->where('exam_id', $schedule->exam_id)
            ->where('class_id', $schedule->class_id)
            ->when(
                $schedule->section_id !== null,
                fn ($query) => $query->where('section_id', $schedule->section_id),
            )
            ->where('status', 'published')
            ->exists();

        if ($publishedExists) {
            throw ValidationException::withMessages([
                'records' => ['Unpublish the affected results before editing marks.'],
            ]);
        }

        return DB::transaction(function () use ($schedule, $validated, $user) {
            $studentIds = [];

            foreach ($validated['records'] as $record) {
                $studentIds[] = (int) $record['student_id'];
                $attendance = $record['attendance_status'];

                ExamMark::query()->updateOrCreate(
                    [
                        'school_id' => $schedule->school_id,
                        'exam_schedule_id' => $schedule->id,
                        'student_id' => $record['student_id'],
                    ],
                    [
                        'marks_obtained' => $attendance === 'present' ? $record['marks_obtained'] : null,
                        'attendance_status' => $attendance,
                        'remarks' => $record['remarks'] ?? null,
                        'entered_by' => $user->id,
                        'status' => $validated['status'] ?? 'submitted',
                    ],
                );
            }

            ExamMark::query()
                ->where('exam_schedule_id', $schedule->id)
                ->whereNotIn('student_id', $studentIds)
                ->delete();

            return $schedule->refresh();
        });
    }

    /**
     * @return array{count: int, result_ids: array<int, int>}
     */
    public function publish(Exam $exam, int $classId, ?int $sectionId, User $publisher): array
    {
        $students = Student::query()
            ->where('academic_session_id', $exam->academic_session_id)
            ->where('class_id', $classId)
            ->when($sectionId !== null, fn ($query) => $query->where('section_id', $sectionId))
            ->where('status', 'active')
            ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
            ->orderBy('first_name')
            ->get();

        if ($students->isEmpty()) {
            throw ValidationException::withMessages([
                'class_id' => ['No active students were found for the selected result scope.'],
            ]);
        }

        $resultIds = DB::transaction(function () use ($exam, $students, $publisher) {
            $ids = [];

            foreach ($students as $student) {
                $calculated = $this->calculateStudent($exam, $student);

                if ($calculated['result_status'] === 'incomplete') {
                    throw ValidationException::withMessages([
                        'marks' => ["Marks are incomplete for {$student->full_name}."],
                    ]);
                }

                $result = ExamResult::query()->updateOrCreate(
                    [
                        'school_id' => $exam->school_id,
                        'exam_id' => $exam->id,
                        'student_id' => $student->id,
                    ],
                    [
                        'class_id' => $student->class_id,
                        'section_id' => $student->section_id,
                        'total_marks' => $calculated['total_marks'],
                        'obtained_marks' => $calculated['obtained_marks'],
                        'percentage' => $calculated['percentage'],
                        'grade' => $calculated['grade'],
                        'result_status' => $calculated['result_status'],
                        'status' => 'published',
                        'published_at' => now(),
                        'published_by' => $publisher->id,
                    ],
                );

                $result->items()->delete();

                foreach ($calculated['items'] as $item) {
                    ExamResultItem::create([
                        'school_id' => $exam->school_id,
                        'exam_result_id' => $result->id,
                        ...$item,
                    ]);
                }

                $ids[] = $result->id;
            }

            return $ids;
        });

        return ['count' => count($resultIds), 'result_ids' => $resultIds];
    }

    public function unpublish(Exam $exam, int $classId, ?int $sectionId): int
    {
        $results = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->where('class_id', $classId)
            ->when($sectionId !== null, fn ($query) => $query->where('section_id', $sectionId))
            ->get();

        $count = $results->count();
        $results->each->delete();

        return $count;
    }

    /**
     * @return array{
     *   total_marks: float,
     *   obtained_marks: float,
     *   percentage: float,
     *   grade: string,
     *   result_status: string,
     *   items: array<int, array<string, mixed>>
     * }
     */
    private function calculateStudent(Exam $exam, Student $student): array
    {
        $schedules = ExamSchedule::query()
            ->with('subject')
            ->where('exam_id', $exam->id)
            ->where('class_id', $student->class_id)
            ->where('status', '!=', 'cancelled')
            ->where(function ($query) use ($student) {
                $query->whereNull('section_id');

                if ($student->section_id !== null) {
                    $query->orWhere('section_id', $student->section_id);
                }
            })
            ->get()
            ->sortBy(fn (ExamSchedule $schedule) => $schedule->section_id === null ? 0 : 1)
            ->keyBy('subject_id')
            ->values();

        if ($schedules->isEmpty()) {
            return $this->incompleteResult();
        }

        /** @var Collection<int, ExamMark> $marks */
        $marks = ExamMark::query()
            ->where('student_id', $student->id)
            ->whereIn('exam_schedule_id', $schedules->pluck('id'))
            ->get()
            ->keyBy('exam_schedule_id');

        $items = [];
        $totalMarks = 0.0;
        $obtainedMarks = 0.0;
        $failed = false;
        $incomplete = false;

        foreach ($schedules as $schedule) {
            $mark = $marks->get($schedule->id);

            if ($mark === null || $mark->status !== 'submitted') {
                $incomplete = true;

                continue;
            }

            $attendance = $mark->attendance_status;
            $maxMarks = (float) $schedule->max_marks;
            $passingMarks = (float) $schedule->passing_marks;
            $marksObtained = $attendance === 'present' ? (float) $mark->marks_obtained : null;

            if ($attendance !== 'exempt') {
                $totalMarks += $maxMarks;
                $obtainedMarks += $marksObtained ?? 0;
            }

            $subjectPercentage = $attendance === 'exempt'
                ? null
                : (($marksObtained ?? 0) / $maxMarks) * 100;

            $subjectStatus = match ($attendance) {
                'exempt' => 'exempt',
                'absent' => 'fail',
                default => $marksObtained !== null && $marksObtained >= $passingMarks ? 'pass' : 'fail',
            };

            if ($subjectStatus === 'fail') {
                $failed = true;
            }

            $items[] = [
                'exam_schedule_id' => $schedule->id,
                'subject_id' => $schedule->subject_id,
                'subject_name' => $schedule->subject?->name ?? 'Subject',
                'max_marks' => $maxMarks,
                'passing_marks' => $passingMarks,
                'marks_obtained' => $marksObtained,
                'attendance_status' => $attendance,
                'grade' => $subjectPercentage === null ? 'EX' : $this->grade($subjectPercentage),
                'result_status' => $subjectStatus,
            ];
        }

        if ($incomplete || count($items) !== $schedules->count() || $totalMarks <= 0) {
            return $this->incompleteResult($items);
        }

        $percentage = round(($obtainedMarks / $totalMarks) * 100, 2);

        return [
            'total_marks' => round($totalMarks, 2),
            'obtained_marks' => round($obtainedMarks, 2),
            'percentage' => $percentage,
            'grade' => $this->grade($percentage),
            'result_status' => $failed ? 'fail' : 'pass',
            'items' => $items,
        ];
    }

    private function grade(float $percentage): string
    {
        return match (true) {
            $percentage >= 90 => 'A+',
            $percentage >= 80 => 'A',
            $percentage >= 70 => 'B+',
            $percentage >= 60 => 'B',
            $percentage >= 50 => 'C',
            $percentage >= 40 => 'D',
            default => 'F',
        };
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<string, mixed>
     */
    private function incompleteResult(array $items = []): array
    {
        return [
            'total_marks' => 0.0,
            'obtained_marks' => 0.0,
            'percentage' => 0.0,
            'grade' => '—',
            'result_status' => 'incomplete',
            'items' => $items,
        ];
    }
}
