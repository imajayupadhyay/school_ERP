<?php

namespace App\Http\Resources\Attendance;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'attendance_session_id' => $this->attendance_session_id,
            'student_id' => $this->student_id,
            'status' => $this->status,
            'remarks' => $this->remarks,
            'student' => $this->whenLoaded('student', fn () => $this->student ? [
                'id' => $this->student->id,
                'admission_no' => $this->student->admission_no,
                'full_name' => $this->student->full_name,
                'roll_no' => $this->student->roll_no,
                'class_name' => $this->student->class_name,
                'section' => $this->student->section,
                'status' => $this->student->status,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
