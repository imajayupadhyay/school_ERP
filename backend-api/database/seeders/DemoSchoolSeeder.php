<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Employee;
use App\Models\EmployeeAssignment;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamSchedule;
use App\Models\FeeHead;
use App\Models\FeeInvoice;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use App\Models\Guardian;
use App\Models\HomeworkAssignment;
use App\Models\Notice;
use App\Models\NoticeRead;
use App\Models\Permission;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\User;
use App\Models\UserPermission;
use App\Services\Access\AccessProvisioner;
use App\Services\ExamResultService;
use App\Services\Fees\FeeAssignmentService;
use App\Services\Fees\FeePaymentService;
use App\Services\NoticeService;
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

        // --- RBAC: system roles + backfill user role_id ---
        $this->seedAccess($school);

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
            $this->seedLearningResources($school, $currentSession);
            $this->seedExams($school, $currentSession);
            $this->seedNotices($school);

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
        $this->seedLearningResources($school, $currentSession);
        $this->seedExams($school, $currentSession);
        $this->seedNotices($school);
    }

    /**
     * Seed the school's default system roles, backfill user role_id, and add a
     * sample per-user permission override so the RBAC UI has data to show.
     */
    private function seedAccess(School $school): void
    {
        $provisioner = app(AccessProvisioner::class);
        $provisioner->syncCatalog();
        $provisioner->provisionSchool($school);
        $provisioner->backfillUsers($school);

        // Demo override: give one subject teacher extra rights and revoke one,
        // demonstrating per-individual customization on top of the role.
        $teacherRole = Role::withoutGlobalScope('school')
            ->where('school_id', $school->id)->where('slug', 'teacher')->first();
        $teacher = User::where('school_id', $school->id)
            ->where('role_id', $teacherRole?->id)
            ->orderBy('id')
            ->skip(1)
            ->first();

        if ($teacher === null) {
            return;
        }

        $overrides = [
            'students.create' => true,  // grant beyond the role
            'learning.delete' => false, // revoke from the role
        ];

        foreach ($overrides as $key => $granted) {
            $permission = Permission::where('key', $key)->first();

            if ($permission === null) {
                continue;
            }

            UserPermission::withoutGlobalScope('school')->updateOrCreate(
                ['user_id' => $teacher->id, 'permission_id' => $permission->id],
                ['school_id' => $school->id, 'granted' => $granted],
            );
        }
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

    private function seedLearningResources(School $school, AcademicSession $session): void
    {
        if (HomeworkAssignment::where('school_id', $school->id)->exists()
            || StudyMaterial::where('school_id', $school->id)->exists()) {
            return;
        }

        $creator = User::where('school_id', $school->id)->whereIn('role', ['teacher', 'principal', 'school_admin'])->first();

        if ($creator === null) {
            return;
        }

        $classes = SchoolClass::where('school_id', $school->id)
            ->with(['sections', 'subjects'])
            ->orderBy('sequence')
            ->limit(4)
            ->get();

        foreach ($classes as $index => $class) {
            $section = $class->sections->first();
            $subject = $class->subjects->first();
            $subjectName = $subject?->name ?? 'General';

            HomeworkAssignment::create([
                'school_id' => $school->id,
                'academic_session_id' => $session->id,
                'class_id' => $class->id,
                'section_id' => $section?->id,
                'subject_id' => $subject?->id,
                'created_by' => $creator->id,
                'title' => "{$class->name} {$subjectName} Practice Set",
                'instructions' => 'Complete the assigned questions in your notebook and be ready for discussion in the next class.',
                'assigned_date' => Carbon::now()->subDays($index + 1)->toDateString(),
                'due_date' => Carbon::now()->addDays(3 + $index)->toDateString(),
                'submission_required' => true,
                'status' => 'published',
                'published_at' => Carbon::now()->subDays($index + 1),
            ]);

            StudyMaterial::create([
                'school_id' => $school->id,
                'academic_session_id' => $session->id,
                'class_id' => $class->id,
                'section_id' => null,
                'subject_id' => $subject?->id,
                'created_by' => $creator->id,
                'title' => "{$class->name} {$subjectName} Revision Notes",
                'description' => 'Teacher-curated revision points for the current chapter.',
                'material_type' => 'note',
                'content_url' => null,
                'status' => 'published',
                'published_at' => Carbon::now()->subDays($index + 2),
            ]);
        }

        $class = $classes->first();
        $subject = $class?->subjects->first();

        if ($class !== null) {
            StudyMaterial::create([
                'school_id' => $school->id,
                'academic_session_id' => $session->id,
                'class_id' => $class->id,
                'section_id' => null,
                'subject_id' => $subject?->id,
                'created_by' => $creator->id,
                'title' => 'Foundational Learning Video',
                'description' => 'A sample video link for students to review at home.',
                'material_type' => 'video',
                'content_url' => 'https://example.com/demo-learning-video',
                'status' => 'published',
                'published_at' => Carbon::now()->subDays(1),
            ]);
        }
    }

    private function seedExams(School $school, AcademicSession $session): void
    {
        if (Exam::where('school_id', $school->id)->exists()) {
            return;
        }

        $publisher = User::where('school_id', $school->id)->where('role', 'school_admin')->first();

        if ($publisher === null) {
            return;
        }

        $exam = Exam::create([
            'school_id' => $school->id,
            'academic_session_id' => $session->id,
            'name' => 'Term I Examination',
            'exam_type' => 'term',
            'start_date' => Carbon::now()->subDays(12)->toDateString(),
            'end_date' => Carbon::now()->subDays(5)->toDateString(),
            'description' => 'Demo term examination with published sample results.',
            'status' => 'completed',
        ]);

        $classSections = Student::where('school_id', $school->id)
            ->where('academic_session_id', $session->id)
            ->where('status', 'active')
            ->whereNotNull('class_id')
            ->whereNotNull('section_id')
            ->select('class_id', 'section_id')
            ->distinct()
            ->orderBy('class_id')
            ->limit(4)
            ->get();

        $resultService = app(ExamResultService::class);

        foreach ($classSections as $scopeIndex => $scope) {
            $class = SchoolClass::where('school_id', $school->id)->find($scope->class_id);

            if ($class === null) {
                continue;
            }

            $subjects = $class->subjects()->orderBy('subjects.id')->limit(3)->get();
            $schedules = [];

            foreach ($subjects as $subjectIndex => $subject) {
                $schedule = ExamSchedule::create([
                    'school_id' => $school->id,
                    'exam_id' => $exam->id,
                    'class_id' => $scope->class_id,
                    'section_id' => $scope->section_id,
                    'subject_id' => $subject->id,
                    'exam_date' => Carbon::now()->subDays(12 - ($subjectIndex * 2))->toDateString(),
                    'start_time' => '09:00',
                    'end_time' => '11:00',
                    'max_marks' => 100,
                    'passing_marks' => 35,
                    'room' => 'Room '.($scopeIndex + 1),
                    'status' => 'completed',
                ]);
                $schedules[] = $schedule;
            }

            $students = Student::where('school_id', $school->id)
                ->where('academic_session_id', $session->id)
                ->where('class_id', $scope->class_id)
                ->where('section_id', $scope->section_id)
                ->where('status', 'active')
                ->orderByRaw('CAST(roll_no AS UNSIGNED), roll_no')
                ->get();

            foreach ($schedules as $scheduleIndex => $schedule) {
                foreach ($students as $studentIndex => $student) {
                    $score = 48 + (($studentIndex * 7 + $scheduleIndex * 9 + $scopeIndex * 3) % 48);

                    ExamMark::create([
                        'school_id' => $school->id,
                        'exam_schedule_id' => $schedule->id,
                        'student_id' => $student->id,
                        'marks_obtained' => $score,
                        'attendance_status' => 'present',
                        'entered_by' => $publisher->id,
                        'status' => 'submitted',
                    ]);
                }
            }

            if ($schedules !== [] && $students->isNotEmpty()) {
                $resultService->publish(
                    $exam,
                    (int) $scope->class_id,
                    (int) $scope->section_id,
                    $publisher,
                );
            }
        }
    }

    private function seedNotices(School $school): void
    {
        $publisher = User::where('school_id', $school->id)->where('role', 'school_admin')->first();

        if ($publisher === null) {
            return;
        }

        $noticeService = app(NoticeService::class);
        $firstClass = SchoolClass::where('school_id', $school->id)->orderBy('sequence')->first();
        $firstSection = $firstClass?->sections()->orderBy('id')->first();
        $definitions = [
            [
                'title' => 'Annual Foundation Day Celebration',
                'body' => 'Students, parents, and staff are invited to the annual Foundation Day celebration in the main auditorium.',
                'category' => 'event',
                'priority' => 'important',
                'status' => 'published',
                'publish_at' => Carbon::now()->subDays(2),
                'published_at' => Carbon::now()->subDays(2),
                'expires_at' => Carbon::now()->addDays(10),
                'targets' => [['type' => 'school']],
            ],
            [
                'title' => 'Weather Advisory',
                'body' => 'Please monitor official school updates before departure. Transport timing changes will be shared through the school office.',
                'category' => 'urgent_alert',
                'priority' => 'urgent',
                'status' => 'published',
                'publish_at' => Carbon::now()->subHours(4),
                'published_at' => Carbon::now()->subHours(4),
                'expires_at' => Carbon::now()->addDays(2),
                'targets' => [
                    ['type' => 'role', 'value' => 'parent'],
                    ['type' => 'role', 'value' => 'employee'],
                ],
            ],
            [
                'title' => 'Post-Examination Review Meeting',
                'body' => 'The class teacher will review Term I performance and answer parent questions during the scheduled meeting.',
                'category' => 'exam',
                'priority' => 'normal',
                'status' => 'published',
                'publish_at' => Carbon::now()->subDay(),
                'published_at' => Carbon::now()->subDay(),
                'expires_at' => Carbon::now()->addDays(14),
                'targets' => $firstSection
                    ? [['type' => 'section', 'id' => $firstSection->id]]
                    : [['type' => 'school']],
            ],
            [
                'title' => 'Upcoming School Holiday',
                'body' => 'The school will remain closed on the announced holiday. Regular classes resume the following working day.',
                'category' => 'holiday',
                'priority' => 'normal',
                'status' => 'scheduled',
                'publish_at' => Carbon::now()->addDays(3),
                'published_at' => null,
                'expires_at' => Carbon::now()->addDays(9),
                'targets' => [['type' => 'school']],
            ],
        ];

        foreach ($definitions as $index => $definition) {
            $targets = $definition['targets'];
            unset($definition['targets']);

            $notice = Notice::updateOrCreate(
                ['school_id' => $school->id, 'title' => $definition['title']],
                [
                    ...$definition,
                    'created_by' => $publisher->id,
                    'published_by' => $definition['status'] === 'published' ? $publisher->id : null,
                ],
            );
            $noticeService->syncTargets($notice, $targets);

            if ($index === 0) {
                User::where('school_id', $school->id)
                    ->where('status', 'active')
                    ->orderBy('id')
                    ->limit(4)
                    ->get()
                    ->each(fn (User $user) => NoticeRead::updateOrCreate(
                        ['notice_id' => $notice->id, 'user_id' => $user->id],
                        [
                            'school_id' => $school->id,
                            'read_at' => Carbon::now()->subDay(),
                        ],
                    ));
            }
        }
    }
}
