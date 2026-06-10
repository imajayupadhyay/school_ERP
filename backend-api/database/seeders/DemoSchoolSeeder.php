<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\Employee;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
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
    }
}
