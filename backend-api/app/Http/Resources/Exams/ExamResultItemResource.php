<?php

namespace App\Http\Resources\Exams;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamResultItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_schedule_id' => $this->exam_schedule_id,
            'subject_id' => $this->subject_id,
            'subject_name' => $this->subject_name,
            'max_marks' => (float) $this->max_marks,
            'passing_marks' => (float) $this->passing_marks,
            'marks_obtained' => $this->marks_obtained !== null ? (float) $this->marks_obtained : null,
            'attendance_status' => $this->attendance_status,
            'grade' => $this->grade,
            'result_status' => $this->result_status,
        ];
    }
}
