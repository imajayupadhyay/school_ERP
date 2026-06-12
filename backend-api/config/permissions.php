<?php

/*
|--------------------------------------------------------------------------
| RBAC permission registry
|--------------------------------------------------------------------------
| Single source of truth for the permission catalog and the default
| permission sets for seeded system roles. Read by:
|   - PermissionSeeder (populates the global `permissions` table)
|   - App\Support\PermissionRegistry (catalog + role templates)
|   - GET /api/v1/access/permissions (grouped catalog for the matrix UI)
|
| A permission key is "<module>.<action>" (e.g. "students.update").
| Add a module/action here and re-run the seeder — nothing else hardcodes it.
*/

return [

    // Human labels for each action, reused across modules.
    'action_labels' => [
        'view' => 'View',
        'create' => 'Create',
        'update' => 'Edit',
        'delete' => 'Delete',
        'export' => 'Export',
        'collect' => 'Collect payment',
        'publish' => 'Publish',
        'marks' => 'Enter marks',
        'manage' => 'Manage',
    ],

    // Actions that are "special" / sensitive (flagged in the matrix UI).
    'special_actions' => ['export', 'collect', 'publish', 'marks', 'manage'],

    /*
    | Modules and their available actions. `group` drives both the matrix
    | grouping and the sidebar section. Order here is the display order.
    */
    'modules' => [
        'dashboard' => [
            'label' => 'Dashboard',
            'group' => 'Overview',
            'actions' => ['view'],
        ],
        'students' => [
            'label' => 'Students',
            'group' => 'People',
            'actions' => ['view', 'create', 'update', 'delete', 'export'],
        ],
        'guardians' => [
            'label' => 'Parents & Guardians',
            'group' => 'People',
            'actions' => ['view', 'create', 'update', 'delete'],
        ],
        'employees' => [
            'label' => 'Teachers & Staff',
            'group' => 'People',
            'actions' => ['view', 'create', 'update', 'delete'],
        ],
        'academic' => [
            'label' => 'Classes & Academic Setup',
            'group' => 'Academics',
            'actions' => ['view', 'create', 'update', 'delete'],
        ],
        'attendance' => [
            'label' => 'Attendance',
            'group' => 'Academics',
            'actions' => ['view', 'create', 'update', 'delete'],
        ],
        'exams' => [
            'label' => 'Exams & Results',
            'group' => 'Academics',
            'actions' => ['view', 'create', 'update', 'delete', 'marks', 'publish'],
        ],
        'learning' => [
            'label' => 'Homework & Materials',
            'group' => 'Academics',
            'actions' => ['view', 'create', 'update', 'delete'],
        ],
        'fees' => [
            'label' => 'Fees & Payments',
            'group' => 'Operations',
            'actions' => ['view', 'create', 'update', 'delete', 'collect'],
        ],
        'notices' => [
            'label' => 'Notices',
            'group' => 'Operations',
            'actions' => ['view', 'create', 'update', 'delete', 'publish'],
        ],
        'reports' => [
            'label' => 'Reports & Audit Logs',
            'group' => 'System',
            'actions' => ['view', 'export'],
        ],
        'settings' => [
            'label' => 'School Settings',
            'group' => 'System',
            'actions' => ['view', 'update'],
        ],
        'access' => [
            'label' => 'Roles & Permissions',
            'group' => 'System',
            'actions' => ['view', 'manage'],
        ],
    ],

    /*
    | Default system roles seeded per school. `permissions` is either the
    | string '*' (owner — every permission, resolved dynamically and locked
    | in the UI) or an explicit list of keys / "<module>.*" wildcards expanded
    | by PermissionRegistry::expand().
    |
    | `is_protected` roles cannot be deleted (they back login provisioning and
    | existing users). Slugs school_admin/principal/teacher/staff must exist
    | because EmployeeController provisions logins with those role strings.
    */
    'roles' => [
        'school_admin' => [
            'name' => 'School Admin',
            'description' => 'Full access to the entire school panel.',
            'is_owner' => true,
            'is_protected' => true,
            'permissions' => '*',
        ],
        'principal' => [
            'name' => 'Principal',
            'description' => 'Full access to the entire school panel.',
            'is_owner' => true,
            'is_protected' => true,
            'permissions' => '*',
        ],
        'accountant' => [
            'name' => 'Accountant',
            'description' => 'Manages fee structures, collections, and finance reports.',
            'is_owner' => false,
            'is_protected' => false,
            'permissions' => [
                'dashboard.view',
                'students.view',
                'guardians.view',
                'fees.*',
                'reports.view',
                'reports.export',
            ],
        ],
        'receptionist' => [
            'name' => 'Receptionist',
            'description' => 'Front-desk admissions and enquiries.',
            'is_owner' => false,
            'is_protected' => false,
            'permissions' => [
                'dashboard.view',
                'students.view', 'students.create', 'students.update',
                'guardians.view', 'guardians.create', 'guardians.update',
                'attendance.view',
                'notices.view',
            ],
        ],
        'class_teacher' => [
            'name' => 'Class Teacher',
            'description' => 'Attendance, homework, marks, and class notices for assigned classes.',
            'is_owner' => false,
            'is_protected' => false,
            'permissions' => [
                'dashboard.view',
                'students.view',
                'academic.view',
                'attendance.view', 'attendance.create',
                'exams.view', 'exams.marks',
                'learning.*',
                'notices.view',
            ],
        ],
        'teacher' => [
            'name' => 'Subject Teacher',
            'description' => 'Marks entry and study material for assigned subjects.',
            'is_owner' => false,
            'is_protected' => true,
            'permissions' => [
                'dashboard.view',
                'students.view',
                'academic.view',
                'attendance.view', 'attendance.create',
                'exams.view', 'exams.marks',
                'learning.*',
                'notices.view',
            ],
        ],
        'librarian' => [
            'name' => 'Librarian',
            'description' => 'Manages study materials and library resources.',
            'is_owner' => false,
            'is_protected' => false,
            'permissions' => [
                'dashboard.view',
                'students.view',
                'learning.*',
            ],
        ],
        'staff' => [
            'name' => 'Staff',
            'description' => 'General non-teaching staff with basic access.',
            'is_owner' => false,
            'is_protected' => true,
            'permissions' => [
                'dashboard.view',
                'notices.view',
            ],
        ],
    ],
];
