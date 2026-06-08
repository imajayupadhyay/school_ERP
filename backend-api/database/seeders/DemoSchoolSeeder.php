<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\Student;
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
        User::updateOrCreate(
            ['school_id' => $school->id, 'email' => 'demo@gmail.com'],
            [
                'name' => 'Demo Admin',
                'phone' => '+91 98765 43210',
                'role' => 'school_admin',
                'status' => 'active',
                'password' => Hash::make('Demo@123'),
            ],
        );

        // --- Teaching staff ---
        $teachers = [
            'Anita Sharma', 'Rahul Verma', 'Priya Nair', 'Sandeep Rao',
            'Meera Iyer', 'Vikram Singh', 'Neha Gupta', 'Arjun Mehta',
        ];
        foreach ($teachers as $i => $name) {
            $slug = strtolower(str_replace(' ', '.', $name));
            User::updateOrCreate(
                ['school_id' => $school->id, 'email' => "{$slug}@demoschool.edu"],
                [
                    'name' => $name,
                    'phone' => '+91 9'.str_pad((string) (800000000 + $i), 9, '0', STR_PAD_LEFT),
                    'role' => $i === 0 ? 'principal' : 'teacher',
                    'status' => 'active',
                    'password' => Hash::make('Teacher@123'),
                ],
            );
        }

        // --- Students (idempotent: only seed when this school has none) ---
        if (Student::where('school_id', $school->id)->exists()) {
            return;
        }

        $firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Diya', 'Saanvi', 'Ananya', 'Ishaan', 'Kabir', 'Myra', 'Aanya', 'Reyansh', 'Kiara', 'Advik', 'Riya', 'Ayaan', 'Pari', 'Vihaan', 'Anvi', 'Arnav', 'Navya'];
        $lastNames = ['Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Nair', 'Reddy', 'Iyer', 'Mehta', 'Rao'];
        $classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
        $sections = ['A', 'B'];

        $admissionSeq = 1;
        foreach ($classes as $classIndex => $className) {
            foreach ($sections as $section) {
                $count = random_int(10, 18);
                for ($roll = 1; $roll <= $count; $roll++) {
                    $gender = random_int(0, 1) === 0 ? 'male' : 'female';

                    Student::create([
                        'school_id' => $school->id,
                        'admission_no' => 'ADM'.str_pad((string) $admissionSeq, 4, '0', STR_PAD_LEFT),
                        'first_name' => $firstNames[array_rand($firstNames)],
                        'last_name' => $lastNames[array_rand($lastNames)],
                        'gender' => $gender,
                        'date_of_birth' => Carbon::now()->subYears(5 + $classIndex)->subDays(random_int(0, 364))->toDateString(),
                        'class_name' => $className,
                        'section' => $section,
                        'roll_no' => (string) $roll,
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
