<?php

namespace App\Http\Resources\Students;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class StudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'academic_session_id' => $this->academic_session_id,
            'admission_no' => $this->admission_no,
            'admission_type' => $this->admission_type,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'class_id' => $this->class_id,
            'section_id' => $this->section_id,
            'class_name' => $this->class_name,
            'section' => $this->section,
            'roll_no' => $this->roll_no,
            'house' => $this->house,
            'category' => $this->category,
            'religion' => $this->religion,
            'blood_group' => $this->blood_group,
            'nationality' => $this->nationality,
            'mother_tongue' => $this->mother_tongue,
            'photo_path' => $this->photo_path,
            'photo_url' => $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null,
            'primary_phone' => $this->primary_phone,
            'primary_email' => $this->primary_email,
            'current_address' => $this->current_address,
            'permanent_address' => $this->permanent_address,
            'city' => $this->city,
            'state' => $this->state,
            'postal_code' => $this->postal_code,
            'country' => $this->country,
            'guardian_name' => $this->guardian_name,
            'guardian_phone' => $this->guardian_phone,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_relation' => $this->emergency_contact_relation,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'medical_conditions' => $this->medical_conditions,
            'allergies' => $this->allergies,
            'medications' => $this->medications,
            'doctor_name' => $this->doctor_name,
            'doctor_phone' => $this->doctor_phone,
            'previous_school_name' => $this->previous_school_name,
            'previous_school_board' => $this->previous_school_board,
            'previous_school_class' => $this->previous_school_class,
            'previous_school_transfer_certificate_no' => $this->previous_school_transfer_certificate_no,
            'status' => $this->status,
            'admission_date' => $this->admission_date?->toDateString(),
            'transfer_date' => $this->transfer_date?->toDateString(),
            'transfer_reason' => $this->transfer_reason,
            'academic_session' => $this->whenLoaded('academicSession', fn () => $this->academicSession ? [
                'id' => $this->academicSession->id,
                'name' => $this->academicSession->name,
            ] : null),
            'class' => $this->whenLoaded('schoolClass', fn () => $this->schoolClass ? [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
            ] : null),
            'section_ref' => $this->whenLoaded('schoolSection', fn () => $this->schoolSection ? [
                'id' => $this->schoolSection->id,
                'name' => $this->schoolSection->name,
            ] : null),
            'guardians' => GuardianResource::collection($this->whenLoaded('guardians')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
