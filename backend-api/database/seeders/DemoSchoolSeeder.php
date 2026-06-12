<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Employee;
use App\Models\EmployeeAssignment;
use App\Models\FeeHead;
use App\Models\FeeInvoice;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use App\Models\Guardian;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Services\Fees\FeeAssignmentService;
use App\Services\Fees\FeePaymentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds a ready-to-demo tenant:
 *   School code: Demo
 *   Admin login: demo@gmail.com / Demo@123
 * Plus teachers and a realistic spread of students so the dashboard has data.
 */
class DemoSchoolSeeder extends Seeder
{
    public function run(): void
    {
        $school = School::updateOrCreate(
            ['code' => 'Demo'],
            [
                'name' => 'Demo Public School',
                'email' => 'demo@gmail.com',
                'phone' => '+91 98765 43210',
                'address' => '12 Education Lane',
                'city' => 'Gurugram',
                'status' => 'active',
            ],
        );

        // --- School admin ---
        $admin = User::updateOrCreate(
            ['school_id' => $school->id, 'email' => 'demo@gmail.com'],
            [
                'name' => 'Demo Admin',
                'phone' => '+91 98765 43210',
                'role' => 'school_admin',
                'status' => 'active',
                'password' => Hash::make('Demo@123'),
            ],
        );

        Employee::updateOrCreate(
            ['school_id' => $school->id, 'employee_code' => 'EMP000'],
            [
                'user_id' => $admin->id,
                'first_name' => 'Demo',
                'last_name' => 'Admin',
                'employee_type' => 'non_teaching',
                'designation' => 'School Administrator',
                'department' => 'Administration',
                'employment_type' => 'full_time',
                'joining_date' => Carbon::now()->subYears(3)->toDateString(),
                'email' => 'demo@gmail.com',
                'phone' => '+91 98765 43210',
                'status' => 'active',
            ],
        );

        // --- Teaching staff ---
        $teachers = [
            'Anita Sharma', 'Rahul Verma', 'Priya Nair', 'Sandeep Rao',
            'Meera Iyer', 'Vikram Singh', 'Neha Gupta', 'Arjun Mehta',
        ];
        foreach ($teachers as $i => $name) {
            $slug = strtolower(str_replace(' ', '.', $name));
            $user = User::updateOrCreate(
                ['school_id' => $school->id, 'email' => "{$slug}@demoschool.edu"],
                [
                    'name' => $name,
                    'phone' => '+91 9'.str_pad((string) (800000000 + $i), 9, '0', STR_PAD_LEFT),
                    'role' => $i === 0 ? 'principal' : 'teacher',
                    'status' => 'active',
                    'password' => Hash::make('Teacher@123'),
                ],
            );

            [$firstName, $lastName] = explode(' ', $name, 2);

            Employee::updateOrCreate(
                ['school_id' => $school->id, 'employee_code' => 'EMP'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT)],
                [
                    'user_id' => $user->id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'employee_type' => 'teaching',
                    'designation' => $i === 0 ? 'Principal' : 'Teacher',
                    'department' => $i % 2 === 0 ? 'Primary' : 'Senior',
                    'employment_type' => 'full_time',
                    'joining_date' => Carbon::now()->subYears(random_int(1, 8))->toDateString(),
                    'qualification' => $i === 0 ? 'M.Ed' : 'B.Ed',
                    'experience_years' => random_int(2, 15),
                    'email' => "{$slug}@demoschool.edu",
                    'phone' => '+91 9'.str_pad((string) (800000000 + $i), 9, '0', STR_PAD_LEFT),
                    'status' => 'active',
                ],
            );
        }

        // --- Academic setup used by student management ---
        $currentSession = AcademicSession::updateOrCreate(
            ['school_id' => $school->id, 'name' => '2026-27'],
            [
                'start_date' => '2026-04-01',
                'end_date' => '2027-03-31',
                'is_current' => true,
                'status' => 'active',
            ],
        );

        $classModels = [];
        $sectionModels = [];
        $classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
        $sections = ['A', 'B'];

        foreach ($classes as $classIndex => $className) {
            $classModels[$className] = SchoolClass::updateOrCreate(
                ['school_id' => $school->id, 'name' => $className],
                ['sequence' => $classIndex + 1, 'status' => 'active'],
            );

            foreach ($sections as $section) {
                $sectionModels[$className][$section] = Section::updateOrCreate(
                    ['class_id' => $classModels[$className]->id, 'name' => $section],
                    ['school_id' => $school->id, 'capacity' => 40, 'status' => 'active'],
                );
            }
        }

        foreach (['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi'] as $subjectName) {
            $subject = Subject::updateOrCreate(
                ['school_id' => $school->id, 'name' => $subjectName],
                ['code' => strtoupper(substr($subjectName, 0, 4)), 'type' => 'theory', 'status' => 'active'],
            );

            $subject->classes()->syncWithoutDetaching(
                collect($classModels)->mapWithKeys(fn (SchoolClass $class) => [
                    $class->id => ['school_id' => $school->id],
                ])->all(),
            );
        }

        $this->seedTeacherAssignments($school, $classModels, $sectionModels);

        // --- Students (idempotent: only seed when this school has none) ---
        if (Student::where('school_id', $school->id)->exists()) {
            Student::where('school_id', $school->id)
                ->whereNull('class_id')
                ->get()
                ->each(function (Student $student) use ($currentSession, $classModels, $sectionModels) {
                    $class = $student->class_name ? ($classModels[$student->class_name] ?? null) : null;
                    $section = $student->class_name && $student->section
                        ? ($sectionModels[$student->class_name][$student->section] ?? null)
                        : null;

                    if ($class !== null) {
                        $student->update([
                            'academic_session_id' => $currentSession->id,
                            'class_id' => $class->id,
                            'section_id' => $section?->id,
                        ]);
                    }
                });

            $this->seedGuardians($school);
            $this->seedFees($school, $currentSession, $classModels);
            $this->seedAttendance($school, $currentSession);

            return;
        }

        $firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Diya', 'Saanvi', 'Ananya', 'Ishaan', 'Kabir', 'Myra', 'Aanya', 'Reyansh', 'Kiara', 'Advik', 'Riya', 'Ayaan', 'Pari', 'Vihaan', 'Anvi', 'Arnav', 'Navya'];
        $lastNames = ['Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Nair', 'Reddy', 'Iyer', 'Mehta', 'Rao'];

        $admissionSeq = 1;
        foreach ($classes as $classIndex => $className) {
            foreach ($sections as $section) {
                $count = random_int(10, 18);
                for ($roll = 1; $roll <= $count; $roll++) {
                    $gender = random_int(0, 1) === 0 ? 'male' : 'female';

                    Student::create([
                        'school_id' => $school->id,
                        'academic_session_id' => $currentSession->id,
                        'admission_no' => 'ADM'.str_pad((string) $admissionSeq, 4, '0', STR_PAD_LEFT),
                        'first_name' => $firstNames[array_rand($firstNames)],
                        'last_name' => $lastNames[array_rand($lastNames)],
                        'gender' => $gender,
                        'date_of_birth' => Carbon::now()->subYears(5 + $classIndex)->subDays(random_int(0, 364))->toDateString(),
                        'class_id' => $classModels[$className]->id,
                        'section_id' => $sectionModels[$className][$section]->id,
                        'class_name' => $className,
                        'section' => $section,
                        'roll_no' => (string) $roll,
                        'house' => ['Tagore', 'Gandhi', 'Nehru', 'Raman'][array_rand(['Tagore', 'Gandhi', 'Nehru', 'Raman'])],
                        'category' => 'General',
                        'guardian_name' => $firstNames[array_rand($firstNames)].' '.$lastNames[array_rand($lastNames)],
                        'guardian_phone' => '+91 9'.str_pad((string) random_int(100000000, 999999999), 9, '0', STR_PAD_LEFT),
                        'status' => 'active',
                        'admission_date' => Carbon::now()->subDays(random_int(5, 720))->toDateString(),
                    ]);

                    $admissionSeq++;
                }
            }
        }

        $this->seedGuardians($school);
        $this->seedFees($school, $currentSession, $classModels);
        $this->seedAttendance($school, $currentSession);
    }

    /**
     * @param  array<string, SchoolClass>  $classModels
     */
    private function seedFees(School $school, AcademicSession $session, array $classModels): void
    {
        // Idempotent: only seed fees once per school.
        if (FeeHead::where('school_id', $school->id)->exists()) {
            return;
        }

        $headDefs = [
            'Tuition Fee' => ['code' => 'TUI', 'optional' => false],
            'Transport Fee' => ['code' => 'TRA', 'optional' => false],
            'Admission Fee' => ['code' => 'ADM', 'optional' => false],
            'Examination Fee' => ['code' => 'EXM', 'optional' => false],
            'Library Fee' => ['code' => 'LIB', 'optional' => false],
            'Sports Fee' => ['code' => 'SPT', 'optional' => true],
        ];

        $heads = [];
        foreach ($headDefs as $name => $meta) {
            $heads[$name] = FeeHead::create([
                'school_id' => $school->id,
                'name' => $name,
                'code' => $meta['code'],
                'is_optional' => $meta['optional'],
                'status' => 'active',
            ]);
        }

        // One structure per class, with class-scaled amounts.
        $structures = [];
        foreach ($classModels as $className => $class) {
            $classIndex = max($class->sequence - 1, 0);

            $structure = FeeStructure::create([
                'school_id' => $school->id,
                'academic_session_id' => $session->id,
                'class_id' => $class->id,
                'name' => "{$className} Fees {$session->name}",
                'status' => 'active',
            ]);

            $lines = [
                ['head' => 'Tuition Fee', 'amount' => 2000 + ($classIndex * 200), 'frequency' => 'monthly', 'optional' => false],
                ['head' => 'Transport Fee', 'amount' => 1000, 'frequency' => 'monthly', 'optional' => false],
                ['head' => 'Admission Fee', 'amount' => 5000, 'frequency' => 'one_time', 'optional' => false],
                ['head' => 'Examination Fee', 'amount' => 1500, 'frequency' => 'quarterly', 'optional' => false],
                ['head' => 'Library Fee', 'amount' => 800, 'frequency' => 'annual', 'optional' => false],
                ['head' => 'Sports Fee', 'amount' => 1200, 'frequency' => 'annual', 'optional' => true],
            ];

            foreach ($lines as $line) {
                FeeStructureItem::create([
                    'school_id' => $school->id,
                    'fee_structure_id' => $structure->id,
                    'fee_head_id' => $heads[$line['head']]->id,
                    'amount' => $line['amount'],
                    'frequency' => $line['frequency'],
                    'is_optional' => $line['optional'],
                ]);
            }

            $structures[$class->id] = $structure;
        }

        // Assign plans to a demonstrative subset, then collect a few payments.
        $assignmentService = app(FeeAssignmentService::class);
        $paymentService = app(FeePaymentService::class);
        $collector = User::where('school_id', $school->id)->where('role', 'school_admin')->first();

        $students = Student::where('school_id', $school->id)
            ->whereNotNull('class_id')
            ->orderBy('id')
            ->limit(24)
            ->get();

        foreach ($students as $index => $student) {
            $structure = $structures[$student->class_id] ?? null;

            if ($structure === null) {
                continue;
            }

            // Every 5th student gets a 10% sibling concession.
            $options = $index % 5 === 0
                ? ['discount_type' => 'percent', 'discount_value' => 10, 'discount_reason' => 'Sibling concession']
                : [];

            $assignment = $assignmentService->assignStructure($student, $structure, $options);

            if ($collector === null) {
                continue;
            }

            $invoices = FeeInvoice::where('student_fee_assignment_id', $assignment->id)
                ->orderBy('due_date')
                ->get();

            // Pay the first 1-3 invoices; leave one partial for variety.
            $payCount = ($index % 3) + 1;
            foreach ($invoices->take($payCount) as $position => $invoice) {
                $amount = ($index % 4 === 0 && $position === $payCount - 1)
                    ? round((float) $invoice->total_amount / 2, 2) // a partial payment
                    : (float) $invoice->total_amount;

                $paymentService->record($invoice, [
                    'amount' => $amount,
                    'mode' => ['cash', 'upi', 'online', 'card'][$index % 4],
                    'paid_on' => Carbon::now()->subDays(random_int(1, 40))->toDateString(),
                ], $collector);
            }
        }
    }

    private function seedGuardians(School $school): void
    {
        if (Guardian::where('school_id', $school->id)->exists()) {
            return;
        }

        Student::where('school_id', $school->id)
            ->orderBy('id')
            ->limit(30)
            ->get()
            ->each(function (Student $student, int $index) use ($school) {
                $relationship = $index % 2 === 0 ? 'Father' : 'Mother';
                $guardianName = $student->guardian_name ?: ($relationship === 'Father' ? 'Ravi Sharma' : 'Anita Sharma');
                $email = 'parent.'.strtolower((string) $student->admission_no).'@demoschool.edu';

                $user = User::updateOrCreate(
                    ['school_id' => $school->id, 'email' => $email],
                    [
                        'name' => $guardianName,
                        'phone' => $student->guardian_phone,
                        'role' => 'parent',
                        'status' => 'active',
                        'password' => Hash::make('Parent@123'),
                    ],
                );

                $guardian = Guardian::create([
                    'school_id' => $school->id,
                    'user_id' => $user->id,
                    'name' => $guardianName,
                    'relation' => $relationship,
                    'phone' => $student->guardian_phone,
                    'email' => $email,
                    'occupation' => $relationship === 'Father' ? 'Business' : 'Service',
                    'address' => $student->current_address,
                    'status' => 'active',
                ]);

                $guardian->students()->attach($student->id, [
                    'school_id' => $school->id,
                    'relationship' => $relationship,
                    'is_primary' => true,
                    'is_emergency_contact' => true,
                    'pickup_allowed' => true,
                ]);
            });
    }

    /**
     * @param  array<string, SchoolClass>  $classModels
     * @param  array<string, array<string, Section>>  $sectionModels
     */
    private function seedTeacherAssignments(School $school, array $classModels, array $sectionModels): void
    {
        $teachers = Employee::where('school_id', $school->id)
            ->where('employee_type', 'teaching')
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        if ($teachers->isEmpty()) {
            return;
        }

        $index = 0;
        foreach ($classModels as $className => $class) {
            foreach ($sectionModels[$className] ?? [] as $section) {
                $teacher = $teachers[$index % $teachers->count()];

                EmployeeAssignment::updateOrCreate(
                    [
                        'school_id' => $school->id,
                        'employee_id' => $teacher->id,
                        'class_id' => $class->id,
                        'section_id' => $section->id,
                        'assignment_type' => 'class_teacher',
                    ],
                    [
                        'subject_id' => null,
                        'status' => 'active',
                    ],
                );

                $index++;
            }
        }
    }

    private function seedAttendance(School $school, AcademicSession $session): void
    {
        if (AttendanceSession::where('school_id', $school->id)->exists()) {
            return;
        }

        $marker = User::where('school_id', $school->id)->where('role', 'school_admin')->first();

        if ($marker === null) {
            return;
        }

        $classSectionPairs = Student::where('school_id', $school->id)
            ->where('academic_session_id', $session->id)
            ->where('status', 'active')
            ->whereNotNull('class_id')
            ->whereNotNull('section_id')
            ->select('class_id', 'section_id')
            ->distinct()
            ->orderBy('class_id')
            ->orderBy('section_id')
            ->limit(8)
            ->get();

        $dates = collect();
        $cursor = Carbon::now();
        while ($dates->count() < 6) {
            if (! $cursor->isWeekend()) {
                $dates->push($cursor->toDateString());
            }
            $cursor = $cursor->copy()->subDay();
        }

        foreach ($classSectionPairs as $pairIndex => $pair) {
            foreach ($dates as $dateIndex => $date) {
                $attendanceSession = AttendanceSession::create([
                    'school_id' => $school->id,
                    'academic_session_id' => $session->id,
                    'class_id' => $pair->class_id,
                    'section_id' => $pair->section_id,
                    'attendance_date' => $date,
                    'marked_by' => $marker->id,
                    'status' => 'submitted',
                    'remarks' => $dateIndex === 0 ? 'Demo attendance roster' : null,
                ]);

                Student::where('school_id', $school->id)
                    ->where('academic_session_id', $session->id)
                    ->where('class_id', $pair->class_id)
                    ->where('section_id', $pair->section_id)
                    ->where('status', 'active')
                    ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
                    ->get()
                    ->each(function (Student $student, int $studentIndex) use ($school, $attendanceSession, $pairIndex, $dateIndex) {
                        $status = 'present';

                        if (($studentIndex + $dateIndex + $pairIndex) % 17 === 0) {
                            $status = 'absent';
                        } elseif (($studentIndex + $dateIndex) % 11 === 0) {
                            $status = 'late';
                        } elseif (($studentIndex + $pairIndex) % 23 === 0) {
                            $status = 'excused';
                        }

                        AttendanceRecord::create([
                            'school_id' => $school->id,
                            'attendance_session_id' => $attendanceSession->id,
                            'student_id' => $student->id,
                            'status' => $status,
                            'remarks' => $status === 'present' ? null : ucfirst(str_replace('_', ' ', $status)),
                        ]);
                    });
            }
        }
    }
}
