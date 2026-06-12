<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamResultItem extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'exam_result_id',
        'exam_schedule_id',
        'subject_id',
        'subject_name',
        'max_marks',
        'passing_marks',
        'marks_obtained',
        'attendance_status',
        'grade',
        'result_status',
    ];

    protected function casts(): array
    {
        return [
            'max_marks' => 'decimal:2',
            'passing_marks' => 'decimal:2',
            'marks_obtained' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<ExamResult, $this> */
    public function result(): BelongsTo
    {
        return $this->belongsTo(ExamResult::class, 'exam_result_id');
    }

    /** @return BelongsTo<ExamSchedule, $this> */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ExamSchedule::class, 'exam_schedule_id');
    }

    /** @return BelongsTo<Subject, $this> */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
