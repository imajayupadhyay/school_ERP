<?php

/*
|--------------------------------------------------------------------------
| In-app notification event registry
|--------------------------------------------------------------------------
| The notification bell is derived from the audit log — every module already
| writes audit entries, so this is the single, can't-be-forgotten event sink.
| This registry decides which audit `action`s are notification-worthy and how
| to present them. Anything not listed here is ignored by the bell (it still
| lives in the Reports > Audit Logs trail).
|
| Each entry: action => [
|   'category'   => module key (drives the icon/tint on the frontend),
|   'title'      => human-readable headline shown in the bell,
|   'permission' => permission key the recipient must hold to be notified
|                   (null = everyone); keeps the feed RBAC-aware,
|   'route'      => admin route to open when the notification is clicked,
| ]
|
| Only meaningful "something happened" events are included (new admissions,
| collected fees, published results/notices, etc.) — routine edits/deletes are
| intentionally left out to keep the bell high-signal.
*/

return [

    'events' => [
        // People
        'student.created' => [
            'category' => 'students',
            'title' => 'New student admitted',
            'permission' => 'students.view',
            'route' => '/admin/students',
        ],
        'student.promoted' => [
            'category' => 'students',
            'title' => 'Students promoted to the next class',
            'permission' => 'students.view',
            'route' => '/admin/students',
        ],
        'guardian.created' => [
            'category' => 'guardians',
            'title' => 'New parent / guardian added',
            'permission' => 'guardians.view',
            'route' => '/admin/guardians',
        ],
        'employee.created' => [
            'category' => 'employees',
            'title' => 'New staff member added',
            'permission' => 'employees.view',
            'route' => '/admin/employees',
        ],

        // Fees
        'fee_payment.collected' => [
            'category' => 'fees',
            'title' => 'Fee payment collected',
            'permission' => 'fees.view',
            'route' => '/admin/fees',
        ],
        'fee_payment.voided' => [
            'category' => 'fees',
            'title' => 'Fee payment voided',
            'permission' => 'fees.view',
            'route' => '/admin/fees',
        ],
        'student_fee.assigned' => [
            'category' => 'fees',
            'title' => 'Fee plan assigned to a student',
            'permission' => 'fees.view',
            'route' => '/admin/fees',
        ],

        // Exams
        'exam.created' => [
            'category' => 'exams',
            'title' => 'New exam scheduled',
            'permission' => 'exams.view',
            'route' => '/admin/exams',
        ],
        'exam_results.published' => [
            'category' => 'exams',
            'title' => 'Exam results published',
            'permission' => 'exams.view',
            'route' => '/admin/exams',
        ],

        // Communication
        'notice.created' => [
            'category' => 'notices',
            'title' => 'New notice posted',
            'permission' => 'notices.view',
            'route' => '/admin/notices',
        ],

        // Learning
        'homework.created' => [
            'category' => 'learning',
            'title' => 'Homework assigned',
            'permission' => 'learning.view',
            'route' => '/admin/learning',
        ],
        'study_material.created' => [
            'category' => 'learning',
            'title' => 'New study material shared',
            'permission' => 'learning.view',
            'route' => '/admin/learning',
        ],

        // Academics
        'timetable.published' => [
            'category' => 'timetables',
            'title' => 'Class timetable published',
            'permission' => 'timetables.view',
            'route' => '/admin/timetable',
        ],
        'academic_session.set_current' => [
            'category' => 'academic',
            'title' => 'Current academic session changed',
            'permission' => 'academic.view',
            'route' => '/admin/academic-setup',
        ],
    ],

];
