# SchoolLID ERP Workflow

## Purpose

This file is the project memory for the SchoolLID ERP build. Every AI agent and developer should read this file before starting work so the project continues from the current state instead of restarting planning each time.

## Current Project State

Status as of: 2026-06-08

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

Not Started:

- Full RBAC (permission tables / action-level permissions) — currently a single `role` string per user.
- School Admin CRUD modules (Students, Teachers, Classes, Attendance, Fees, Exams, Notices) — sidebar items present, marked "Soon".
- Platform Super Admin web panel.
- Student, Parent, and Teacher/Employee portals.
- Audit logs, file uploads.
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

Recommended initial tenancy model:

- One central MySQL database.
- Tenant-scoped records use `school_id`.
- Platform Super Admin can manage all schools.
- School Admin and employees can only access records belonging to their school.
- Parent and Student accounts can only access linked student data.

Do not let React or React Native connect directly to MySQL. Only Laravel talks to the database.

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
