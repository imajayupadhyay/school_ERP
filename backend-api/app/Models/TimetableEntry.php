<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimetableEntry extends Model
{
    use BelongsToSchool, HasFactory;

    protected $fillable = [
        'school_id',
        'timetable_id',
        'period_slot_id',
        'subject_id',
        'employee_id',
        'day_of_week',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
        ];
    }

    /** @return BelongsTo<Timetable, $this> */
    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class);
    }

    /** @return BelongsTo<PeriodSlot, $this> */
    public function periodSlot(): BelongsTo
    {
        return $this->belongsTo(PeriodSlot::class);
    }

    /** @return BelongsTo<Subject, $this> */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
