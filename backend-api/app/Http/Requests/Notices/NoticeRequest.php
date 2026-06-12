<?php

namespace App\Http\Requests\Notices;

use App\Models\Employee;
use App\Models\Guardian;
use App\Models\Notice;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class NoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:10000'],
            'category' => ['required', 'in:general,circular,urgent_alert,event,holiday,exam'],
            'priority' => ['required', 'in:normal,important,urgent'],
            'status' => ['required', 'in:draft,scheduled,published,archived'],
            'publish_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'targets' => ['required', 'array', 'min:1', 'max:100'],
            'targets.*.type' => ['required', 'in:school,role,class,section,student,guardian,employee'],
            'targets.*.id' => ['nullable', 'integer', 'min:1'],
            'targets.*.value' => ['nullable', 'string', 'max:60'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $notice = $this->route('notice');
                $notice = $notice instanceof Notice ? $notice : null;
                $schoolId = $this->user()?->school_id ?? $notice?->school_id;
                $status = $this->string('status')->toString();
                $publishAt = $validator->errors()->has('publish_at') ? null : $this->date('publish_at');
                $expiresAt = $validator->errors()->has('expires_at') ? null : $this->date('expires_at');

                if ($status === 'scheduled' && $publishAt === null) {
                    $validator->errors()->add('publish_at', 'A publication date and time is required for scheduled notices.');
                }

                if ($status === 'scheduled' && $publishAt?->isPast()) {
                    $validator->errors()->add('publish_at', 'Scheduled publication must be in the future.');
                }

                if ($status === 'published' && $publishAt?->isFuture()) {
                    $validator->errors()->add('publish_at', 'Use scheduled status for a future publication time.');
                }

                $publicationBase = $publishAt ?? now();
                if ($expiresAt !== null && $expiresAt->lessThanOrEqualTo($publicationBase)) {
                    $validator->errors()->add('expires_at', 'The expiry date must be after publication.');
                }

                $seen = [];
                foreach ($this->input('targets', []) as $index => $target) {
                    $type = $target['type'] ?? null;
                    $id = isset($target['id']) ? (int) $target['id'] : null;
                    $value = $target['value'] ?? null;
                    $key = "{$type}:".($id ?? $value ?? 'all');

                    if (isset($seen[$key])) {
                        $validator->errors()->add("targets.{$index}", 'Duplicate audience target.');
                    }
                    $seen[$key] = true;

                    if ($type === 'school') {
                        continue;
                    }

                    if ($type === 'role') {
                        if (! in_array($value, ['teacher', 'employee', 'parent', 'student'], true)) {
                            $validator->errors()->add("targets.{$index}.value", 'Select a valid audience role.');
                        }

                        continue;
                    }

                    if ($id === null) {
                        $validator->errors()->add("targets.{$index}.id", 'Select a valid audience record.');

                        continue;
                    }

                    $exists = match ($type) {
                        'class' => SchoolClass::forSchool($schoolId)->whereKey($id)->exists(),
                        'section' => Section::forSchool($schoolId)->whereKey($id)->exists(),
                        'student' => Student::forSchool($schoolId)->whereKey($id)->exists(),
                        'guardian' => Guardian::forSchool($schoolId)->whereKey($id)->exists(),
                        'employee' => Employee::forSchool($schoolId)->whereKey($id)->exists(),
                        default => false,
                    };

                    if (! $exists) {
                        $validator->errors()->add("targets.{$index}.id", 'The selected audience record is invalid.');
                    }
                }
            },
        ];
    }
}
