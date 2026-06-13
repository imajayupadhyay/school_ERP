# SchoolLID ERP Workflow

## Purpose

This file is the project memory for the SchoolLID ERP build. Every AI agent and developer should read this file before starting work so the project continues from the current state instead of restarting planning each time.

## Current Project State

Status as of: 2026-06-13 (Timetable: per-class period schedules added)

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
- Fees & Payment Management module (Phase 3, item 9):
  - Full instalment billing engine. New tables (all `BelongsToSchool`): `fee_heads` (fee components — Tuition, Transport, Admission, Exam, Library, Sports…), `fee_structures` (per academic-session + class, school-wide when `class_id` null) and `fee_structure_items` (head + per-occurrence amount + frequency), `student_fee_assignments` + `student_fee_items` (the structure is **snapshotted** onto the student so later structure edits never change assigned dues; holds per-head discounts and custom one-off lines), `fee_invoices` + `fee_invoice_items` (dated instalments with per-head breakdown), and `fee_payments` (collection ledger).
  - Frequencies (`one_time`/`monthly`/`quarterly`/`half_yearly`/`annual`) drive instalment generation across the session window: monthly→one invoice per session month, quarterly→every 3rd month, half_yearly→every 6th, annual/one_time→once; charges due in the same month are merged into one invoice. Overdue is derived (`balance > 0 && due_date < today`), not stored. Sequential `INV-{school}-{n}` and `RCP-{school}-{n}` numbering.
  - Services keep controllers thin: `App\Services\Fees\InvoiceGeneratorService` (expands items → invoices; **payment-safe regeneration** — preserves invoices that already have collected money, rebuilds only the still-open months, anchors one-time/annual fees to the first open month, and never re-bills a one-off already paid), `FeeAssignmentService` (snapshot + assign + edit-items + reassign/cancel; reassigning to a different structure is still blocked when payments exist), `FeePaymentService` (records/voids payments, allocates to invoice, recomputes paid/partial/paid status — supports partial payments).
  - API (admin/principal/super_admin for writes; audit-logged): `GET/POST/GET one/PUT/DELETE /api/v1/fee-heads`; same for `/fee-structures` (nested `items[]` sync, `?academic_session_id=&class_id=` filters); `GET /fees/students` (Collections roster with billed/paid/outstanding/overdue aggregates), `GET /fees/students/{student}` (plan + items + invoices + summary), `POST .../assign`, `PUT .../items`, `POST .../cancel`; `GET/POST /fee-payments`, `GET /fee-payments/{id}`, `POST /fee-payments/{id}/void`. Discounts per fee head (none/percent/fixed) + custom lines; payment modes cash/cheque/online/card/upi/bank_transfer.
  - Web: `/admin/fees` — Fees sidebar item enabled; tabbed page (Collections | Fee Structures | Fee Heads). Collections roster (search + class filter + pagination, status badges) opens a **StudentFeeDrawer** showing summary, plan items (with discounts/custom flags), instalment table with per-invoice **Collect** action, payment history with void, and an assign-plan panel for students without a plan. A **PlanEditorModal** ("Edit plan") gives a full per-student custom plan editor: add any fee head or a free custom line, set amount/frequency/per-line discount, and tick/untick **Bill** to include optional fees or hold a line — saving regenerates invoices payment-safely. Fee Structures modal builds dynamic line items; Fee Heads CRUD modal. Shared `StatusBadge` extended with paid/partial/pending/overdue/cancelled.
  - Student admission flow: the student create/edit modal (`StudentPage`) now has an optional **Fee Plan** section — pick a structure (filtered to the student's class + school-wide) and an optional discount; on save the plan is assigned and invoices generated in one flow (edit only reassigns when a structure is actively chosen).
  - `DemoSchoolSeeder` extended: 6 fee heads, a structure per class, 24 assigned plans (every 5th student gets a 10% sibling concession), generated invoices, and sample full/partial payments. Fresh seed yields 288 invoices / 48 payments with mixed paid/partial/pending statuses.
  - Backend feature tests in `tests/Feature/Fees/FeeManagementTest.php` (21 tests: fee-head/structure CRUD + uniqueness + role checks, instalment counts per frequency, optional-item exclusion, discount math, custom lines, reassignment, partial/full payment + sequential receipts, overpayment rejection, payment void, payment-safe editing — preserves paid invoices / rebuilds unpaid / anchors mid-year one-offs / never double-bills a paid one-off / turns an optional fee on for a student, tenant isolation). Full suite: 75/75 passing.
  - Verified end-to-end with curl against the demo school (login → roster aggregates → student plan → partial payment → overpayment 422 → teacher 403 on writes / 200 read → edit plan to add an optional + custom fee and confirm invoices regenerate) and `npm run build` in `webapp/` (193 modules, no TS errors).
- Attendance Management module (Phase 3, item 8):
  - New tenant-scoped tables: `attendance_sessions` (one daily class/section roster per academic session/date, marked user, draft/submitted status, remarks) and `attendance_records` (one row per student with present/absent/late/half_day/excused status and remarks). Both use `BelongsToSchool`.
  - Models: `AttendanceSession` and `AttendanceRecord`; `Student` now has `attendanceRecords()`.
  - API: `GET /api/v1/attendance/roster`, `POST /attendance/sessions`, `GET /attendance/sessions`, `GET /attendance/sessions/{id}`, and `GET /attendance/reports/summary`.
  - Validation enforces same-school academic session/class/section/student references, section-belongs-to-class checks, active-student roster membership, date inside the academic session, and teacher assignment access.
  - Access: school_admin/principal/super_admin can manage all rosters; teachers can view/mark only class/section rosters assigned through `employee_assignments`; other roles are blocked from marking.
  - Web: `/admin/attendance` — Attendance sidebar item enabled; tabs for Mark Attendance, Sessions, and Reports. Marking supports session/class/section/date filters, roster loading, all-present/clear-remarks actions, per-student status/remarks, draft save and submit. Sessions tab lists marked rosters and opens detail records. Reports tab shows date-range summaries and per-student attendance percentages.
  - `DemoSchoolSeeder` now creates class-teacher assignments and recent demo attendance sessions/records.
  - Backend feature tests in `tests/Feature/Attendance/AttendanceManagementTest.php` (6 tests covering roster load, marking, update without duplicate session, assigned teacher access, unassigned teacher 403, roster validation, tenant-scoped summary). Full suite: 81/81 passing.
  - Verified with `npm run build` in `webapp/` (199 modules, no TS errors; Vite still reports the existing large chunk-size warning after admin screens).
- Homework & Study Material module (Phase 3, item 10):
  - New tenant-scoped tables: `homework_assignments` (session/class/section/subject, title, instructions, assigned/due dates, submission flag, optional attachment, draft/published/archived status) and `study_materials` (session/class/section/subject, title, description, material type document/video/link/note/worksheet, optional URL/file, status). Both use `BelongsToSchool`.
  - Models: `HomeworkAssignment` and `StudyMaterial`; `LearningService` centralizes teacher assignment-aware access checks, visible query scoping, and publish timestamp handling.
  - API: `GET/POST/GET one/PUT/DELETE /api/v1/homework`, `POST /homework/{id}/attachment`; `GET/POST/GET one/PUT/DELETE /api/v1/study-materials`, `POST /study-materials/{id}/attachment`.
  - Validation enforces same-school academic session/class/section/subject references, section-belongs-to-class checks, subject mapped to selected class, due date after assigned date, and required URLs for video/link materials.
  - Access: school_admin/principal/super_admin can manage all homework/materials; teachers can create/update/archive only for assigned class/section/subject scopes through `employee_assignments`; other roles see no records until student/parent portals define their read contracts.
  - Web: `/admin/learning` — Sidebar item "Homework & Materials" enabled; tabs for Homework and Study Materials with search, class/section/subject/status/type filters, pagination, create/edit/archive modals, attachment upload, and direct file/link actions.
  - `DemoSchoolSeeder` now creates sample published homework and study materials for demo classes.
  - Backend feature tests in `tests/Feature/Learning/LearningManagementTest.php` (7 tests covering homework create/upload, teacher scope restrictions, validation, tenant/teacher scoped listing, study material create/update/archive, URL requirement, file upload). Full suite: 88/88 passing.
  - Verified with `npm run build` in `webapp/` (204 modules, no TS errors; Vite still reports the existing large chunk-size warning after admin screens).
- Exams, Marks & Results module (Phase 3, item 9):
  - New tenant-scoped tables: `exams`, `exam_schedules`, `exam_marks`, `exam_results`, and `exam_result_items`. Published result items preserve a subject-level report-card snapshot even if later academic setup changes.
  - Models: `Exam`, `ExamSchedule`, `ExamMark`, `ExamResult`, and `ExamResultItem`; `Student` now exposes marks and results relationships. All school-owned models use `BelongsToSchool`.
  - API: exam CRUD under `/api/v1/exams`; paper schedule CRUD under `/exam-schedules`; roster-based marks entry at `/exam-schedules/{id}/marks`; scoped result listing, publish/unpublish, and individual report-card endpoints under `/exams/{exam}/results`.
  - Validation enforces same-school session/class/section/subject/student references, exam dates within the academic session and exam window, valid class-subject mappings, marks within the paper maximum, and correct absent/exempt handling.
  - Access: school_admin/principal/super_admin manage exams, schedules, and publication; teachers can view and enter marks only for assigned class/section/subject schedules. Published results lock affected marks and schedules until unpublished.
  - Result engine calculates totals, percentage, grades, and subject-level pass/fail; publication is blocked until every required mark is submitted. Unpublishing removes the result snapshots and unlocks marks for correction.
  - Web: `/admin/exams` — Exams & Results sidebar item enabled; tabs for Exams & Schedules, Marks Entry, and Results. Includes exam/paper CRUD, assigned-paper rosters, draft/submitted marks, publish/unpublish actions, result summaries, and detailed report-card modal.
  - `DemoSchoolSeeder` creates a Term I exam across four class/section scopes, schedules up to three subjects per scope, submits marks, and publishes demo results. Verified seed: 1 exam, 12 schedules, 132 marks, and 44 results.
  - Backend feature tests in `tests/Feature/Exams/ExamManagementTest.php` (8 tests covering CRUD/audit, validation, teacher assignment access, marks rules, grade/result calculation, incomplete publication guard, published lock/unpublish, and tenant isolation). Full suite: 96/96 passing with 393 assertions.
  - Verified with all five MySQL migrations, targeted ESLint for the new exam UI, and `npm run build` in `webapp/` (210 modules, no TypeScript errors; Vite still reports the existing large chunk-size warning).
- Notices & Communication module (Phase 3, item 11):
  - New tenant-scoped tables: `notices` (message, category, priority, draft/scheduled/published/archive state, publish/expiry timing, attachment), `notice_targets` (normalized school/role/class/section/student/guardian/employee audiences with display-label snapshots), and `notice_reads` (one read receipt per portal user).
  - Models: `Notice`, `NoticeTarget`, and `NoticeRead`; all use `BelongsToSchool`. Scheduled notices become visible automatically when `publish_at` is reached, and expired notices automatically leave non-manager feeds without requiring a cron status update.
  - API: paginated/filterable `GET/POST/GET one/PUT/DELETE /api/v1/notices`, `POST /notices/{id}/attachment`, `POST /notices/{id}/read`, and manager-only `GET /notices/{id}/delivery`.
  - Targeting supports the requirement document's school-wide, role, class, section, student, parent/guardian, and employee audiences. Validation enforces same-school targets, valid roles, unique targets, future scheduled publication, and expiry after publication.
  - Access: school_admin/principal/super_admin create, edit, archive, attach, and inspect delivery; teachers receive a read-only feed for school/staff/teacher notices and assigned class/section targets; parent targeting resolves through linked children and guardian portal users for future parent portal reuse.
  - Delivery tracking resolves active portal accounts across the selected audience, reports read/unread counts, and lists recipient-level read timestamps. Direct student notices currently reach linked guardian accounts; student-account delivery will activate when student portal users are introduced.
  - Web: `/admin/notices` — Notices sidebar item enabled; search/category/priority/status filters, pagination, create/edit/archive, attachment upload, draft/scheduled/published timing, audience builder with roles/classes/sections/individual recipient search, read-only teacher feed, notice detail, and delivery/read table.
  - `DemoSchoolSeeder` creates four notices (event, urgent alert, exam meeting, scheduled holiday), five audience targets, and sample reads. Verified seed: 4 notices, 5 targets, 4 reads; 3 currently published and 1 scheduled.
  - Backend feature tests in `tests/Feature/Notices/NoticeManagementTest.php` (8 tests covering normalized targets/audit, validation, teacher assignment visibility, automatic scheduling, parent/student targeting, role restrictions, attachment/read/delivery tracking, and tenant isolation). Full suite: 104/104 passing with 452 assertions.
  - Verified with all three MySQL migrations, authenticated API smoke testing, targeted ESLint, and `npm run build` in `webapp/` (215 modules, no TypeScript errors; Vite still reports the existing large chunk-size warning).
- Reports & Audit Logs module (Phase 3, item 12):
  - `AuditLog` now uses the mandatory `BelongsToSchool` global scope so audit records are tenant-scoped by default.
  - Backend API added under `/api/v1/reports`: `GET /reports/overview`, `GET /reports/audit-logs`, and `GET /reports/audit-logs/summary`.
  - Access is restricted to `school_admin`, `principal`, and `super_admin`; teachers and other roles receive 403. All endpoints require the authenticated user to belong to a school.
  - Report overview supports date range, academic session, class, and section filters. It returns student counts/new admissions, employee counts/new joiners, fee billed/collected/outstanding/overdue, attendance rate, published result pass rate, homework/material/notice counts, audit-event counts, class-wise fee/attendance/result tables, and a recent audit activity trend.
  - Audit logs support search, module filter, exact action filter, actor filter, date range, pagination, module summary, top actors, and recent events. Responses include actor, auditable target, changed fields, change count, full recorded changes, IP address, and timestamp.
  - Web: `/admin/reports` — Reports & Audit Logs sidebar item enabled. Page uses the admin design system with `PageHeader`, `SegmentedTabs`, filter toolbar, KPI cards, class-level report tables, activity bars, audit log table, pagination, and a detail modal showing before/after field changes.
  - Backend feature tests in `tests/Feature/Reports/ReportAndAuditLogTest.php` (3 tests covering overview aggregates without tenant leakage, filterable/scoped audit logs and summary, and teacher 403 access). Full suite: 109/109 passing with 529 assertions.
  - Verified with `npm run build` in `webapp/` (227 modules, no TypeScript errors; Vite still reports the existing large chunk-size warning).
- Role & Permission Management / full RBAC (Phase 3, item 13):
  - Hybrid model: **role permissions ∪ per-user grants − per-user revokes**. Owner roles (`school_admin`, `principal`) and platform `super_admin` resolve to all permissions (`*`) and cannot be locked out.
  - New global catalog table `permissions` (key `module.action`, grouped, `is_special` flag) seeded from a single registry `config/permissions.php`; tenant-scoped `roles` (+ `role_permissions`) and per-user `user_permissions` (`granted` grant/revoke), and a nullable `users.role_id` FK (the legacy `role` string stays in sync with the role slug for backward compatibility). Permission catalog is the source of truth for the seeder, the API, and the matrix UI — add a module/action there and re-seed, nothing else hardcodes it.
  - Models `Permission`, `Role`, `UserPermission`; `App\Models\Concerns\HasPermissions` on `User` (`hasPermission()`, `effectivePermissions()`, `isOwner()` — with a backward-compat fallback that resolves from the role string's template when `role_id` is null, so older users and tests still work). `App\Support\PermissionRegistry` reads the config (catalog/grouped/templates/owner slugs). `App\Services\Access\AccessProvisioner` seeds the catalog, provisions a school's default system roles (School Admin & Principal [owner], Accountant, Receptionist, Class Teacher, Subject Teacher, Librarian, Staff), backfills `role_id`, and assigns roles — reusable from seeders and future school-creation flows.
  - Enforcement: `App\Http\Middleware\EnsurePermission` registered as the `permission` alias and applied as `permission:<key>` to every module route in `routes/api.php`; the scattered `EDITOR_ROLES`/`in_array($user->role,…)` write-guards in controllers and FormRequests were removed (the middleware is now the single backend gate). Teacher `employee_assignments` data-scoping stays in the services (which rosters) — orthogonal to module/action permissions. Special actions are separately gated: `students.export`, `reports.export`, `fees.collect`, `exams.marks` (marks entry, distinct from exam CRUD so teachers can enter marks without creating exams), `exams.publish`. The notices read-feed (index/show/read) stays open to any authenticated user (controller-scoped) for parent/teacher portals; notices management + delivery are gated.
  - API (`Api/V1/Access/`, all gated `permission:access.view`/`access.manage`, audit-logged): `GET /access/permissions` (grouped catalog), `GET/POST/GET one/PUT/DELETE /access/roles` (custom roles fully editable/deletable; system roles editable, `is_protected` blocks delete; owner role matrix locked), `GET /access/users/{user}` (role + effective perms + overrides), `PUT /access/users/{user}` (assign role + replace overrides), `POST /access/users/{user}/reset-password`, `PUT /access/users/{user}/status`. Tenant + target guards in the controller (User route binding is not school-scoped): cross-school → 404, platform admins → 403, self login-status change → 422. `UserResource` (login + `/auth/me`) now carries `role_id`, `role_label`, `is_owner`, and the effective `permissions[]`.
  - Web: `AuthContext` exposes `can(key)`; the **Sidebar now filters every module by its `*.view` permission** (a teacher/staff member only sees their allowed modules), routes are wrapped in `RequirePermission` (permission-denied panel otherwise), and each module page's `canEdit`/`canManage` flags are now `can('students.update')` etc. instead of role-string arrays. New **Roles & Permissions** page (`/admin/roles`, `features/admin/access/`) with a roles table and a module×action permission matrix editor (special actions flagged). New **per-employee Access drawer** in Teachers & Staff: assign role, 3-state per-permission overrides (inherit / grant / revoke), reset password, and activate/deactivate the login. `DemoSchoolSeeder` provisions the demo school's roles, backfills users, and adds a sample override (one teacher granted `students.create`, revoked `learning.delete`).
  - Backend feature tests in `tests/Feature/Access/RbacTest.php` (12 tests: catalog endpoint, owner full access, login payload permissions, custom-role create/sync, role assignment changes effective perms, per-user grant/revoke override, middleware blocks unauthorised writes, reset-password + status toggle, protected/in-use role delete guards, non-manager 403, cross-school tenant isolation). One existing test updated (teachers can no longer view the employee module). Full suite: **121/121 passing** (568 assertions).
  - Verified with `migrate:fresh --seed`, full `php artisan test`, `npm run build` (233 modules, no TS errors; existing chunk-size warning), and a live curl smoke against the demo school (owner `*` vs Subject Teacher scoped perms; teacher 403 on hidden modules/writes; admin grants `students.create` override → teacher write flips 403→422; reset-password/status 200; cross-school 404).
- Timetable module (Phase 3 follow-up — admin builds weekly class timetables assigning teachers + subjects):
  - New tenant-scoped tables (all `BelongsToSchool`): `period_slots` (school-wide bell schedule — name, sequence, start/end time, `is_break`, status), `timetables` (one per academic session + class + section, `draft`/`published` + `published_at`, unique per scope), and `timetable_entries` (one row per filled grid cell — day_of_week 1–6, period_slot, subject, employee; unique `[timetable, day, period_slot]`).
  - Models `PeriodSlot`, `Timetable` (hasMany entries), `TimetableEntry`. Services keep controllers thin: `App\Services\Timetables\TimetableConflictService` (the **block + warn** core — detects a teacher double-booked within the submission or against another class-section timetable in the same session/day/period, returns readable clashes) and `TimetableAccessService` (manager vs teacher read scoping via `employee_assignments`, published-only for teachers).
  - API (`Api/V1/Timetables/`, gated by new `timetables.*` permissions, audit-logged): `GET/POST/PUT/DELETE /api/v1/period-slots`; `GET /timetables` (filter `?academic_session_id=&class_id=&section_id=`), `POST /timetables` (create blank for a class-section), `GET /timetables/{id}` (grid + entries), `PUT /timetables/{id}/entries` (bulk upsert — runs the conflict check, 422 with `errors.entries[]` on clash), `POST /timetables/{id}/publish` + `/unpublish`, `DELETE /timetables/{id}`, and `GET /timetables/teacher/{employee}` (read-only weekly schedule; teachers may only view their own). Validation enforces same-school refs, section-belongs-to-class, subject-mapped-to-class, break slots can't hold a class, one entry per day+period.
  - Permissions: new `timetables` module (`view/create/update/delete`, Academics group) in `config/permissions.php`; `timetables.view` granted to `class_teacher` and `teacher`. The `permission:` middleware is the single write-gate (FormRequests just check auth), so custom roles work.
  - Web: `/admin/timetable` — Timetable sidebar item enabled; tabbed page (Class Timetables | Period Schedule | Teacher View). Class tab: session/class/section picker → create blank timetable → editable weekly grid (days × periods, break rows spanned, each cell opens a subject+teacher picker scoped to the class), draft save + publish/unpublish + delete, inline conflict-clash display. Period Schedule tab: bell-schedule CRUD with break flag. Teacher View: pick a teacher → read-only weekly grid. Reuses `PageHeader`/`SegmentedTabs`/`Modal`/`FormField`/`StatusBadge`/`TableUI`.
  - `DemoSchoolSeeder` extended with `seedTimetable()`: 8 period slots (incl. Short Break + Lunch) and 2 published, clash-free class-section timetables (60 entries). Verified seed: 8 slots, 2 timetables, 60 entries.
  - Backend feature tests in `tests/Feature/Timetables/TimetableManagementTest.php` (8 tests: period-slot CRUD + audit, timetable create + uniqueness guard, bulk entry save, unmapped-subject + break-slot rejection, **teacher double-booking blocked (422)**, publish/unpublish, teacher read-only access + own-only teacher view, tenant isolation). Full suite: **129/129 passing**.
  - Verified with `migrate:fresh --seed`, `npm run build` (238 modules, no TS errors; existing chunk-size warning), targeted ESLint, and a live curl smoke against the demo school (period slots with breaks, 2 published timetables with per-cell subject/teacher, teacher view).
- Timetable follow-up — per-class period schedules (different classes can have different period/lunch times):
  - Period slots are no longer school-wide only. `period_slots` gained a nullable `class_id` (migration `2026_06_13_120000_add_class_id_to_period_slots_table.php`): `class_id = NULL` rows are the school **default** template; `class_id = X` rows are a **class override**. "Effective slots for a class" = its own override slots if any, else the default set. Unique key is now `[school_id, class_id, sequence]`; default-set sequence uniqueness is also enforced in `PeriodSlotRequest` (MySQL treats NULLs as distinct in a unique index). Existing rows became the default automatically (no backfill).
  - New `App\Services\Timetables\PeriodSlotResolver` (`effectiveSlotsForClass`/`effectiveSlotIdsForClass`/`classHasOwnSlots`/`copyDefaultInto`/`removeClassSchedule`) is the single source of truth for which slots apply to a class; reused by the API, entry validation, and seeder. **Seeders/console set `school_id`/`class_id` explicitly** (no auth → `BelongsToSchool` is inert), so the seeder builds slots directly rather than via the resolver.
  - API: `GET /period-slots?class_id=` returns a class's effective slots plus `meta.inherited` (true when showing the default); `POST /period-slots` & `PUT /period-slots/{id}` accept `class_id` (scope never changes on update); new `POST /classes/{class}/period-slots/copy-default` (clone the default into a class — 422 if it already has its own) and `DELETE /classes/{class}/period-slots` (revert to default — **422 if a published timetable still references the override**). Both audit-logged (`period_slot.schedule_copied` / `schedule_reverted`); class route binding is tenant-scoped (cross-school → 404).
  - **Conflict detection rewritten to TIME-OVERLAP** (`TimetableConflictService`): a teacher clashes when two periods overlap in actual clock time on the same day/session, across classes whose schedules differ. Half-open intervals (`aStart < bEnd && bStart < aEnd`) so adjacent periods don't clash; **falls back to equal `period_slot_id` when a slot has no times** (keeps time-less slots / older data working). `TimetableEntryRequest` now validates `period_slot_id` is in the timetable class's effective non-break set (via the resolver).
  - Web (`features/admin/timetable/`): **Period Schedule tab** gained a scope picker ("School default" + each class); a class that inherits shows a banner + **"Create custom schedule"** (copy-default), a class with its own shows CRUD + **"Revert to default"**; inherited rows are read-only. **Class Timetables** grid now fetches the selected class's effective slots (`fetchPeriodSlots({ class_id })`, query key includes `class_id`). **Teacher View** builds its rows from the distinct periods the teacher actually teaches (entries carry `period_slot` with times), sorted by start time — so a teacher spanning differently-scheduled classes renders correctly. `api.ts`/`types.ts` gained the `class_id` param, `PeriodSlotsResult`/`inherited`, and `copyDefaultToClass`/`deleteClassSchedule`.
  - `DemoSchoolSeeder.seedTimetable()` now seeds 8 default slots (`class_id = null`) plus an override for the first demo class (later lunch `12:20–13:00`, Period 6 `13:00–13:45`); each demo timetable bills against its own effective schedule and stays clash-free under time-overlap. Verified seed: 8 default + 8 override slots, 2 timetables, 60 entries, 0 overlapping teacher clashes.
  - Backend tests extended to **16 timetable tests** (added: per-scope sequence uniqueness incl. the default-set NULL guard, effective-slots fallback + `meta.inherited`, copy-default + re-copy 422, revert incl. published-block, time-overlap clash across differently-scheduled classes, adjacent periods allowed, slot-outside-class-schedule rejection, class-schedule endpoint tenant isolation). Full suite: **141/141 passing**.
  - Verified with `migrate:fresh --seed`, full `php artisan test`, `npm run build` (240 modules, no TS errors; existing chunk-size warning), targeted ESLint (clean), and a live curl smoke against the demo school (default vs class-1 override with `inherited` flag, copy-default → 422 re-copy → revert, published-class revert blocked 422).

- In-app notifications — functional topbar notification bell (driven by real dashboard events):
  - **Derived from the audit log** (the existing single event sink every module already writes to — no per-module wiring, nothing can be forgotten). A curated registry in `config/notifications.php` maps notable audit `action`s → `{ category, title, permission, route }` (new admissions, fee collected/voided, results/notice/timetable published, new staff/guardian, homework/material shared, session changed); routine edits/deletes are intentionally excluded to keep the bell high-signal.
  - `App\Services\Notifications\NotificationService` builds the feed with three scoping rules: **tenant** (AuditLog `BelongsToSchool` global scope), **permission** (recipient must hold the action's permission key — owners see all, so e.g. a librarian never sees fee notifications), and **authorship** (a user is never notified about their own actions; system/null-actor events are kept). Per-user **`users.notifications_seen_at` watermark** drives unread state (everything created after it is unread; capped at 99).
  - API (any authenticated user; filtered internally, no route-level gate): `GET /api/v1/notifications` (recent items + `meta.unread_count`), `GET /notifications/unread-count` (lightweight, for polling), `POST /notifications/seen` (sets the watermark). `NotificationController` + `App\Http\Controllers\Api\V1\Notifications`.
  - Web: `features/admin/notifications/` — `NotificationBell` replaces the static topbar bell. **Polls the unread count every 30s + on window focus** (React Query; chosen over WebSockets to avoid extra infra), shows a count badge, and opens a dropdown that loads the feed, highlights unread rows, marks all seen on open (clears the badge), and routes to the relevant module on click. Category-tinted solid icons, loading/empty states. Wired into `components/Topbar.tsx`.
  - Backend feature tests in `tests/Feature/Notifications/NotificationTest.php` (5: others-only + registry filtering, permission filtering, unread watermark + mark-seen, seen flips feed read flags, tenant isolation). Full suite: **146/146 passing**.
  - Verified with `migrate`, full `php artisan test`, `npm run build` (242 modules, no TS errors; existing chunk-size warning), targeted ESLint (clean), and a live curl smoke against the demo school (seed two events by another user → unread 2 → feed with actor/category/route → mark seen → unread 0, read flags flip).

## Phase 4 — Platform Super Admin Panel (in progress)

- Platform foundation — secure login + platform dashboard (Phase 4, module 1):
  - The Platform Super Admin is a `User` with `role = super_admin` and `school_id = null` (already bypasses tenancy via `BelongsToSchool` and all `permission:` gates via `effectivePermissions() = ['*']`). Seeded via tinker — owner account `ajay upadhyay` / `ajayupadhyay030@gmail.com` (no seeder file).
  - Separate auth surface (no school code). New `App\Http\Middleware\EnsurePlatformAdmin` (alias `platform.admin`) rejects anyone who is not an active super_admin with a null `school_id` — a normal school user with a valid Sanctum token still gets 403. Routes under `/api/v1/platform`: public `POST /platform/auth/login` (email + password only, accepted only for a super_admin), and `platform.admin`-gated `GET /platform/auth/me`, `POST /platform/auth/logout`, `GET /platform/dashboard`. `PlatformAuthController` issues a token tagged `platform`.
  - `App\Services\Platform\PlatformDashboardService` returns cross-tenant aggregates (uses `->allSchools()` explicitly): totals (schools, active/inactive, new-this-month, users, students, employees, guardians), schools-by-status breakdown, 6-month onboarding trend, recent schools, and top schools by enrolment. `PlatformDashboardController`.
  - Web: the platform panel is fully isolated from the school app — its own axios client `src/lib/platformApi.ts` (token key `schoollid.platform_token`, **no** `school-code` header), its own `PlatformAuthProvider`/`PlatformProtectedRoute` (scoped to platform routes via `PlatformRoot`), and a distinct **indigo** `.platform-theme` that re-skins the shared admin design-system components (PageHeader, StatCard, TrendChart, TableUI). Routes: `/schoollid-secure-login` (dedicated login page) → `/platform` (`PlatformLayout` shell with `PlatformSidebar` listing the Phase 4 build order as "Soon" items + `PlatformTopbar`) → platform dashboard (`PlatformDashboardPage`: KPI cards, onboarding trend, status breakdown, recent/top schools).
  - Backend feature tests in `tests/Feature/Platform/PlatformDashboardTest.php` (5: super-admin platform login, wrong-password 422, school user rejected at platform login, school-user token blocked from platform dashboard 403, cross-tenant dashboard aggregates). Full suite: **151/151 passing**.
  - Verified with `php artisan test`, `npm run build` (255 modules, no TS errors; existing chunk-size warning), ESLint (clean), and a live curl smoke (login → `*` permissions → dashboard aggregates 1 school/205 students → wrong password 422).

Not Started (Phase 4 remaining modules — build order): school creation & management, school onboarding, subscription plans, school subscription assignment, module/feature access control, billing & invoices, platform users & permissions, support tickets, announcements to schools, notification/payment gateway management, platform reports & audit logs.

Not Started:

- RBAC follow-ups: a dedicated Accountant/Receptionist onboarding flow surfaced in the UI, permission-aware report **export** controls (export endpoints are gated by `reports.export`/`students.export` but the UI export buttons are still gated by the coarser module flag), bulk role assignment, and a `notices.publish` route-level gate (currently publish happens via status on create/update).
- Notices follow-ups: SMS/email/WhatsApp/push channel providers, delivery provider webhooks/statuses, reusable notification templates, and two-way parent-teacher messaging/meeting requests.
- Fees module follow-ups (out of scope this round): printable PDF receipts, fee reminders/notifications, late-fee fines, online payment gateway, bulk invoice regeneration, and a dedicated Accountant role (collection currently gated to school_admin/principal/super_admin until full RBAC lands).
- Reports follow-ups: CSV/PDF exports, scheduled report emails, saved report presets, and deeper module-specific report drilldowns.
- Platform Super Admin web panel — foundation done (see Phase 4 above); remaining modules listed under "Phase 4 — Platform Super Admin Panel".
- Student, Parent, and Teacher/Employee portals.
- Broader file upload workflows.
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
5. Student management.
6. Parent/guardian management.
7. Attendance management.
8. Fees and payment management.
9. Exams, marks, and result management.
10. Homework and study material.
11. Notices and communication.
12. Reports and audit logs.
13. Role and permission management.

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

School Admin Panel (Phase 3) is feature-complete (modules 1–13) plus a Timetable module (weekly class timetables with teacher-clash detection). Next:

1. Surface permission-aware export controls in the UI (the backend already gates `students.export`/`reports.export`; wire the export buttons to those keys).
2. Add CSV/PDF export + saved presets for Reports, and printable PDF receipts/reminders for Fees.
3. Begin Platform Super Admin Panel planning (Phase 4): platform dashboard, school creation/onboarding, subscription plans.
4. Author the Teacher/Employee Portal requirements before building the teacher workflow (Phase 5).
