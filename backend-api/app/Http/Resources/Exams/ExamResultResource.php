<?php

namespace App\Http\Resources\Exams;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_id' => $this->exam_id,
            'student_id' => $this->student_id,
            'class_id' => $this->class_id,
            'section_id' => $this->section_id,
            'total_marks' => (float) $this->total_marks,
            'obtained_marks' => (float) $this->obtained_marks,
            'percentage' => (float) $this->percentage,
            'grade' => $this->grade,
            'result_status' => $this->result_status,
            'status' => $this->status,
            'published_at' => $this->published_at?->toISOString(),
            'exam' => $this->whenLoaded('exam', fn () => $this->exam ? [
                'id' => $this->exam->id,
                'name' => $this->exam->name,
                'exam_type' => $this->exam->exam_type,
                'start_date' => $this->exam->start_date?->toDateString(),
                'end_date' => $this->exam->end_date?->toDateString(),
            ] : null),
            'student' => $this->whenLoaded('student', fn () => $this->student ? [
                'id' => $this->student->id,
                'admission_no' => $this->student->admission_no,
                'full_name' => $this->student->full_name,
                'roll_no' => $this->student->roll_no,
                'class_name' => $this->student->class_name,
                'section' => $this->student->section,
            ] : null),
            'class' => $this->whenLoaded('schoolClass', fn () => $this->schoolClass ? [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
            ] : null),
            'section' => $this->whenLoaded('section', fn () => $this->section ? [
                'id' => $this->section->id,
                'name' => $this->section->name,
            ] : null),
            'publisher' => $this->whenLoaded('publisher', fn () => $this->publisher ? [
                'id' => $this->publisher->id,
                'name' => $this->publisher->name,
            ] : null),
            'items' => ExamResultItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
