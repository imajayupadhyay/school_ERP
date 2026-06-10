# SchoolLID ERP Workflow

## Purpose

This file is the project memory for the SchoolLID ERP build. Every AI agent and developer should read this file before starting work so the project continues from the current state instead of restarting planning each time.

## Current Project State

Status as of: 2026-06-10

Completed:

- Functional requirement PDFs reviewed for School Admin, Student, Parent, and Platform Super Admin portals.
- Brand guideline PDF reviewed and converted into implementation rules in `PROJECT_RULES.md`.
- Project folders created:
  - `backend-api/`
  - `webapp/`
- Initial workflow and project rules documents created.
- Laravel 12 project initialized in `backend-api/`.
- React + Vite + TypeScript project initialized in `webapp/`.
- Initial verification completed:
  - `php artisan test` passes in `backend-api/`.
  - `npm run build` passes in `webapp/`.
- Public web shell started in `webapp/` (Tailwind v4, React Router, React Query, Axios):
  - Marketing `HomePage` (`/`) and `LoginPage` (`/login`) ported in and re-themed to the SchoolLID brand palette (dark/deep green surfaces, warm cream background, brand green CTAs, lime accent for highlights).
  - Brand tokens defined in `src/index.css`; shared API client in `src/lib/api.ts`; query client in `src/lib/queryClient.ts`.
- Backend API foundation (Laravel 12 + Sanctum, MySQL `school_erp`):
  - `/api/v1` routing enabled (`routes/api.php`); consistent JSON envelope via `App\Support\ApiResponse`.
  - Migrations: `schools` (tenant root, `code` login), `users` extended with `school_id`/`role`/`status` (email unique per school), `students`.
  - Models `School`, `User` (HasApiTokens), `Student` (with `forSchool` scope).
  - Auth: `POST /auth/login` (school code + email + password), `GET /auth/me`, `POST /auth/logout`. Tenancy resolved server-side from the token's user.
  - `GET /dashboard` (DashboardController + `DashboardService`): student/staff/class/section counts, by-gender, by-class, recent admissions — all scoped to the user's school.
  - `DemoSchoolSeeder`: school code `Demo`, admin `demo@gmail.com` / `Demo@123`, 8 staff, ~216 students.
- School Admin panel (web) — first authenticated area:
  - `AuthProvider` + `ProtectedRoute`; LoginPage wired to the API with loading/error states.
  - `AdminLayout` (brand-dark sidebar + sticky topbar with user menu/sign-out), responsive.
  - `DashboardPage` with React Query: stat cards, Students-by-Class bar chart, gender donut, recent-admissions table, skeleton/error states. Solid-fill icon set.
  - NOTE: PHP CLI must be Homebrew's 8.5 (`/opt/homebrew/bin/php`); XAMPP's 8.2 fails the vendor platform check. MySQL runs via XAMPP (MariaDB).
- School Profile & Configuration module (Phase 3, item 2):
  - `schools` table extended: contact (alternate phone, website), full address (line2, state, postal code, country), localization (timezone, date format, currency), academic year start month, identifiers (board affiliation, registration number, UDISE code, principal name, established year).
  - New `audit_logs` table + `AuditLog` model + `App\Support\AuditLogger` service — reusable foundation for audit logging across future modules.
  - API: `GET/PUT /api/v1/school-profile`, `POST /api/v1/school-profile/logo` (logo upload to `storage/app/public/schools/{id}`, served via `php artisan storage:link`). Edit/logo-upload restricted to `school_admin`/`principal`/`super_admin`; updates write an audit log entry.
  - Web: `/admin/settings` — sectioned form (General Info, Address, Localization & Academic Year, Identifiers, Branding/logo upload), read-only for non-admin roles. Sidebar "Settings" item enabled.
  - Backend feature tests in `tests/Feature/SchoolProfileTest.php` (8 tests, all passing).
  - Fixed `.env` `APP_URL` to `http://127.0.0.1:8000` so generated `logo_url` resolves correctly against the dev server.
- Tenancy hardening: `App\Models\Concerns\BelongsToSchool` global scope trait applied to `Student` (mandatory for all future tenant models — see `PROJECT_RULES.md`). Tested in `tests/Feature/TenantScopeTest.php` (4 tests, all passing).
- Academic Session, Class, Section, and Subject setup (Phase 3, item 3):
  - New tables: `academic_sessions` (name, start/end date, `is_current`, status), `classes` (name, sequence, status), `sections` (per-class, name, capacity, status), `subjects` (name, code, type theory/practical, status), `class_subject` pivot for class-subject mapping. All use `BelongsToSchool`.
  - Models: `AcademicSession`, `SchoolClass` (table `classes`, has many `sections`, belongs to many `subjects`), `Section` (belongs to `SchoolClass`), `Subject` (belongs to many `SchoolClass` via `class_subject`).
  - API: `GET/POST/PUT/DELETE /api/v1/academic-sessions` + `POST /academic-sessions/{id}/set-current` (transactional, only one session can be current; current session cannot be deleted); `GET/POST/PUT/DELETE /api/v1/classes`; `GET/POST/PUT/DELETE /api/v1/sections` (`?class_id=` filter); `GET/POST/PUT/DELETE /api/v1/subjects` + `PUT /subjects/{id}/classes` (sync class assignments). Writes restricted to `school_admin`/`principal`/`super_admin`, audit-logged.
  - Web: `/admin/academic-setup` — tabbed page (Academic Sessions | Classes & Sections | Subjects) with full CRUD modals, "set as current" session action, nested section management under classes, and class-assignment modal for subjects. Sidebar "Classes" item now links here. Read-only banner for non-admin roles.
  - Shared frontend components promoted to `features/admin/components/`: `FormField`, `SectionCard`, new `Modal`, `StatusBadge`; `extractErrorMessage` moved to `src/lib/errors.ts`.
  - Backend feature tests in `tests/Feature/Academic/` (18 tests: sessions, classes, sections, subjects incl. set-current, delete-current guard, class-subject sync, role checks, uniqueness validation). Full suite: 32/32 passing.
  - Verified via curl smoke test against the demo school (sessions create/update/set-current, sections, subjects, class-subject sync) and `npm run build` (177 modules, no TS errors).
- Employee and Teacher Management module (Phase 3, item 4):
  - New tables: `employees` (profile, contact, employment, status, optional linked `user_id`, soft deletes) and `employee_assignments` (teacher assignment to class, optional section, optional subject, assignment type). Both use tenant `school_id`; `Employee` and `EmployeeAssignment` use `BelongsToSchool`.
  - Employee login access is managed through linked `users` records: creating/updating employees can create/update login users, assign role/status, and disabling/deleting employees deactivates the linked login.
  - API: paginated/searchable/filterable `GET /api/v1/employees`, `POST /employees`, `GET /employees/{id}`, `PUT /employees/{id}`, `DELETE /employees/{id}`, and `PUT /employees/{id}/assignments`. Writes restricted to `school_admin`/`principal`/`super_admin`, audit-logged.
  - Assignment validation enforces tenant-safe class/section/subject references, checks section belongs to the selected class, checks subject is mapped to the selected class, and rejects duplicate assignment rows.
  - Dashboard staff/teacher counts now come from `employees`, so staff without login accounts are counted correctly. `DemoSchoolSeeder` now seeds employee profiles linked to demo admin/teacher users.
  - Web: `/admin/employees` — Teachers & Staff sidebar item enabled; list includes search, type/status filters, pagination, login/status badges, add/edit employee modal, login toggle, delete confirmation, and assignment modal.
  - Backend feature tests in `tests/Feature/Employees/EmployeeTest.php` (8 tests covering create with login, tenant-scoped pagination/search, duplicate validation, role checks, update/login disable, assignment sync/validation, soft delete/login deactivation). Full suite: 40/40 passing.
  - Verified with `npm run build` in `webapp/` (179 modules, no TS errors).
- Student Management module (Phase 3, item 6):
  - Existing `students` table expanded for proper school admin operations: academic session, normalized class/section references, admission type, roll, house, category, profile/contact/address, emergency contact, medical notes, previous school details, photo path, transfer date/reason, and richer statuses.
  - New `guardians` table and `guardian_student` pivot create the foundation for parent/guardian linking and the upcoming Parent/Guardian module.
  - API: paginated/searchable/filterable `GET /api/v1/students`, CSV `GET /students/export`, `POST /students`, `GET /students/{id}`, `PUT /students/{id}`, archive via `DELETE /students/{id}`, `POST /students/{id}/transfer`, `POST /students/{id}/photo`, `GET /students/{id}/history`, and bulk class promotion via `POST /students/promote`.
  - Validation enforces same-school academic session/class/section references, section-belongs-to-class checks, unique admission numbers per school, unique roll numbers per class/section/session, and a single primary guardian.
  - Web: `/admin/students` — Students sidebar item enabled; roster includes search, session/class/section/status/gender filters, pagination, CSV export, profile/history modal, add/edit modal, archive, transfer, photo upload, and promote workflow.
  - `DemoSchoolSeeder` now creates demo academic sessions/classes/sections/subjects and backfills demo students to normalized class/section IDs so admin filters work with demo data.
  - Backend feature tests in `tests/Feature/Students/StudentManagementTest.php` (8 tests covering create with guardian, tenant-scoped filtering, duplicate validation, role checks, archive/transfer, promote, photo, history, export). Full suite: 48/48 passing.
  - Verified with `npm run build` in `webapp/` (181 modules, no TS errors; Vite reports a chunk-size warning after larger admin screens).
- Parent & Guardian Management module (Phase 3, item 7):
  - Uses `guardians` and `guardian_student` created during Student Management; guardian records can now be managed as a first-class admin module with linked parent portal users (`users.role = parent`).
  - API: admin/principal-only `GET/POST/GET one/PUT/DELETE /api/v1/guardians`, `PUT /guardians/{id}/students` for multi-child linking, and `POST /guardians/{id}/reset-password` for parent portal password reset.
  - Security: guardian contact data is treated as sensitive until full RBAC exists; only `school_admin`, `principal`, and `super_admin` can access guardian management APIs.
  - Child linking supports multiple students per guardian, one guardian across multiple children, relationship labels, primary guardian, emergency contact, and pickup permission flags. Marking a guardian primary updates the student's primary guardian contact fields and clears older primary flags for that student.
  - Web: `/admin/guardians` — Parents & Guardians sidebar item enabled; list includes search, status/portal filters, pagination, profile modal, add/edit modal, portal access toggle, child-link modal, reset password, and archive action.
  - `DemoSchoolSeeder` now creates linked guardian records and parent portal demo users for the first demo students. Parent demo accounts use password `Parent@123`.
  - Backend feature tests in `tests/Feature/Guardians/GuardianManagementTest.php` (6 tests covering portal login creation, tenant-scoped restricted listing, child linking/primary behavior, duplicate link validation, portal disable, password reset, archive). Full suite: 54/54 passing.
  - Verified with `npm run build` in `webapp/` (183 modules, no TS errors; Vite reports a chunk-size warning after larger admin screens).

Not Started:

- Full RBAC (permission tables / action-level permissions) — currently a single `role` string per user.
- School Admin CRUD modules still remaining: Attendance, Fees, Exams/Results, Homework/Study Material, Notices/Communication, Reports.
- Platform Super Admin web panel.
- Student, Parent, and Teacher/Employee portals.
- Audit log viewing/reporting and broader file upload workflows.
- Android and iOS apps.

## Main Build Direction

The first target is to complete the web app before mobile apps.

Build order:

1. School Admin Panel web app.
2. Platform Super Admin Panel web app.
3. Teacher/Employee workflows.
4. Student Portal.
5. Parent Portal.
6. React Native mobile apps for Android and iOS.

Backend API and web app must be developed in parallel. The API must not be written only for the web app. It must be clean, versioned, documented, and reusable by the future React Native mobile apps.

## Approved Stack

Backend:

- Laravel API inside `backend-api/`
- MySQL central database
- REST JSON API
- API version prefix: `/api/v1`
- Laravel Sanctum or another Laravel-supported token/session strategy after final auth decision

Web App:

- React inside `webapp/`
- Build as an ERP application, not a marketing site
- Responsive for desktop, tablet, and mobile browser
- Shared API client layer for all backend calls

Mobile Apps:

- React Native, preferably with Expo
- Mobile apps will consume the same Laravel API
- Mobile-specific behavior should be added through API-compatible extensions, not separate duplicated business logic

## Core Architecture Decision

SchoolLID is a multi-tenant SaaS school ERP.

Confirmed tenancy model (single shared database, not per-school databases):

- One central MySQL database for all schools.
- Tenant-scoped records use `school_id`.
- Platform Super Admin can manage all schools.
- School Admin and employees can only access records belonging to their school.
- Parent and Student accounts can only access linked student data.

Do not let React or React Native connect directly to MySQL. Only Laravel talks to the database.

**Why single database (not per-school databases):** instant onboarding (one row insert vs. provisioning a new database + running all migrations), schema changes apply once instead of fanning out across N databases, and platform-wide reporting/dashboards stay simple. The tradeoff (risk of cross-tenant data leaks from a missed `school_id` filter) is mitigated by the mandatory global tenant scope below.

**Tenant isolation enforcement — `BelongsToSchool` trait:**

- `app/Models/Concerns/BelongsToSchool.php` — every school-owned model (`Student` and all future tenant models) must use this trait.
- Adds a global Eloquent scope that auto-filters all queries by the authenticated user's `school_id`, and auto-stamps `school_id` on `create()`.
- Platform Super Admin (`school_id = null`) is unaffected by the scope.
- `Model::forSchool($id)` and `Model::allSchools()` provide explicit overrides for services/seeders/Super Admin use.
- Covered by `tests/Feature/TenantScopeTest.php`.
- Full rule documented in `PROJECT_RULES.md` under "Mandatory Global Tenant Scope" — read it before adding any new tenant-scoped model.

## Source Requirement Documents

Existing requirement PDFs:

- `Documentation/01_School_Admin_Portal_Functionalities.pdf`
- `Documentation/02_Student_Portal_Functionalities.pdf`
- `Documentation/03_Parent_Portal_Functionalities.pdf`
- `Documentation/04_Platform_Super_Admin_Portal_Functionalities.pdf`
- `Schoollid_Brand Guideline.pdf`

Important missing requirement document:

- Teacher/Employee Portal Functionalities

This should be created before the teacher workflow is built. Teachers need their own daily flow for attendance, homework, marks entry, study material, timetable, leave, and parent communication.

## Phase 0: Project Foundation

Goal: Prepare the repo so backend and web can be developed cleanly.

Completed:

- Create `backend-api/`.
- Create `webapp/`.
- Create `workflow.md`.
- Create `PROJECT_RULES.md`.
- Initialize Laravel project in `backend-api/`.
- Initialize React project in `webapp/`.

Remaining:

- Configure Laravel as a dedicated API backend.
- Configure MySQL connection and database.
- Add local development instructions.
- Add environment variable templates.
- Add API documentation structure.
- Add database design documentation.

## Phase 1: Backend API Foundation

Goal: Create a stable API foundation that works for web and mobile.

Backend tasks:

- Set up Laravel project.
- Configure MySQL.
- Create base API routing under `/api/v1`.
- Set up authentication.
- Create user model strategy for platform users, school employees, parents, and students.
- Add tenant resolution and `school_id` enforcement.
- Add role-based access control.
- Add permission actions: view, add, edit, delete, approve, export, print, publish, collect payment, and download documents.
- Add activity logs and audit logs.
- Add request validation patterns.
- Add consistent API response format.
- Add pagination, filtering, sorting, and search conventions.
- Add file upload/storage strategy.
- Add error handling and API exception format.
- Add tests for auth, tenancy, permissions, and core CRUD.

Suggested base entities:

- schools
- users
- roles
- permissions
- role_permissions
- user_roles
- academic_sessions
- branches
- classes
- sections
- subjects
- students
- parents
- student_parent
- employees
- attendance_records
- fee_heads
- fee_structures
- fee_invoices
- fee_payments
- exams
- exam_schedules
- marks
- results
- homework
- study_materials
- notices
- notifications
- leave_requests
- documents
- audit_logs
- subscriptions
- subscription_plans
- invoices
- support_tickets

## Phase 2: Web App Foundation

Goal: Build a reliable ERP shell before module screens.

Web tasks:

- Set up React project in `webapp/`.
- Add routing.
- Add auth screens.
- Add protected routes.
- Add role/permission-aware navigation.
- Add API client layer.
- Add global layout: sidebar, topbar, workspace, page headers, tables, forms, modals.
- Add design tokens from `PROJECT_RULES.md`.
- Add reusable components for tables, filters, forms, status badges, confirm dialogs, file uploads, and report exports.
- Add empty/loading/error states.
- Add responsive behavior.

## Phase 3: School Admin Panel MVP

Goal: Complete the first major web product area.

Build modules in this order:

1. Authentication and school admin dashboard.
2. School profile and configuration.
3. Academic session, class, section, and subject setup.
4. Employee and teacher management.
5. Role and permission management.
6. Student management.
7. Parent/guardian management.
8. Attendance management.
9. Fees and payment management.
10. Exams, marks, and result management.
11. Homework and study material.
12. Notices and communication.
13. Reports and audit logs.

School Admin MVP success criteria:

- A school admin can configure the school basics.
- A school admin can create employees and assign permissions.
- A school admin can create classes, sections, subjects, students, and parents.
- A teacher/employee with limited permissions can only access allowed modules.
- Attendance, fees, exams/results, homework, and notices have working CRUD/API flows.
- Sensitive actions create audit logs.
- Reports support controlled export where permissions allow it.

## Phase 4: Platform Super Admin Panel

Goal: Build the SaaS owner/admin layer after the school-level product starts working.

Build modules in this order:

1. Platform dashboard.
2. School creation and management.
3. School onboarding.
4. Subscription plans.
5. School subscription assignment.
6. Module and feature access control.
7. Billing and invoices.
8. Platform users and permissions.
9. Support tickets.
10. Announcements to schools.
11. Notification/payment gateway management.
12. Platform reports and audit logs.

Platform Super Admin success criteria:

- Platform admin can create and manage schools.
- Platform admin can assign plans and module access.
- School subscription state controls access correctly.
- Billing, invoices, support tickets, and audit logs are available.

## Phase 5: Remaining Web Portals

Teacher/Employee Portal:

- Daily dashboard.
- Assigned classes and subjects.
- Attendance marking.
- Homework and study material.
- Marks entry.
- Timetable.
- Leave requests.
- Parent/student communication if allowed.

Student Portal:

- Dashboard.
- Profile.
- Attendance view.
- Timetable.
- Homework and assignment.
- Study material.
- Exam schedule.
- Results/report card.
- Notices.
- Basic communication.

Parent Portal:

- Dashboard with child switcher.
- Child profile.
- Attendance monitoring.
- Fee view and payment.
- Homework tracking.
- Results/report card.
- Notices.
- Parent-teacher communication.
- Leave request.
- Notifications.

## Phase 6: Mobile Apps

Goal: Build Android and iOS apps after the API and web workflows are stable.

Mobile app scope should start with:

- Parent app.
- Student app.
- Teacher attendance/homework/marks workflows if needed.

Mobile API requirements:

- Same `/api/v1` backend.
- Token-based authentication support.
- Mobile-friendly pagination and filtering.
- Push notification support.
- No duplicate backend business logic.

## Module Delivery Checklist

For every module, complete these items:

- Database tables and migrations.
- Eloquent models and relationships.
- API routes and controllers.
- Request validation.
- Permission checks.
- Audit logs for important actions.
- Tests for major behavior.
- Web routes and screens.
- List, create, view, edit, delete/archive where applicable.
- Search, filters, pagination.
- Empty/loading/error states.
- Export/print only if permission allows.
- Update this `workflow.md` when the module is completed.

## API Contract Rules

Every API module should define:

- Endpoint path.
- HTTP method.
- Required permission.
- Request body.
- Response body.
- Error cases.
- Pagination/filter/search behavior.
- Mobile notes if relevant.

Example path pattern:

- `GET /api/v1/students`
- `POST /api/v1/students`
- `GET /api/v1/students/{id}`
- `PATCH /api/v1/students/{id}`
- `DELETE /api/v1/students/{id}`

## Current Immediate Next Steps

1. Configure Laravel API routing under `/api/v1`.
2. Configure MySQL connection and create the local database.
3. Create database design document for tenancy and core modules.
4. Create authentication and role/permission plan.
5. Start School Admin backend foundation and web shell together.
