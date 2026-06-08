# SchoolLID Project Rules

## Purpose

This file contains strict project rules for AI agents and developers working on SchoolLID ERP. Read this file before making any code, design, architecture, or documentation change.

## Product Direction

SchoolLID is a calm, intelligent, multi-tenant school ERP for school owners, principals, administrators, teachers, parents, and students.

The product should reduce manual school operations across admissions, academics, attendance, fees, exams, communication, and reporting.

The first delivery target is the web app, starting with the School Admin Panel. The backend API must be built in parallel and must be reusable by future Android and iOS apps.

## Folder Ownership

- `backend-api/`: Laravel backend API only.
- `webapp/`: React web app only.
- `Documentation/`: Existing PDF requirement documents.
- Root markdown files: project memory, rules, and planning documents.

Do not mix frontend code inside `backend-api/` unless it is Laravel-required build tooling. Do not put backend Laravel code inside `webapp/`.

## Directory Structure And Separation Of Concerns

- Strictly follow the proper directory structure for each framework.
- Keep Laravel code organized by Laravel best practices: routes, controllers, requests, resources, models, policies, services, jobs, events, listeners, notifications, migrations, seeders, and tests should live in their correct places.
- Keep React code organized by responsibility: pages/routes, components, layouts, hooks, services/API clients, state, utilities, styles, assets, and types should be clearly separated.
- Do not place business logic inside UI components when it belongs in backend services, API handlers, hooks, or domain utilities.
- Do not place database or tenant access rules inside frontend code. Backend must enforce all business, security, permission, and tenancy rules.
- Keep controllers thin. Move reusable or complex backend business logic into services, actions, jobs, policies, or dedicated classes.
- Keep React components focused on rendering and user interaction. Move data fetching, transformations, and reusable behavior into hooks/services where appropriate.
- Avoid large files that combine unrelated responsibilities.
- Avoid duplicated logic. Extract shared behavior only when it has a real repeated use.
- Follow framework conventions before inventing custom structure.
- Every new module should be easy for another developer or AI agent to find, understand, test, and extend.

## Backend Rules

- Use Laravel for the backend API.
- Use MySQL as the primary database.
- Use REST JSON APIs under `/api/v1`.
- Never allow web or mobile clients to connect directly to MySQL.
- Keep APIs reusable for React web and React Native mobile.
- Use request validation for every create/update endpoint.
- Use pagination for list endpoints.
- Use consistent response and error formats.
- Add permission checks at the backend, not only in the frontend.
- Add audit logs for important actions.
- Do not expose sensitive fields unless the role has permission.
- Do not create school-specific hardcoded logic.

## Multi-Tenancy Rules

SchoolLID is a SaaS platform. Tenant safety is mandatory.

- School-level records must be scoped by `school_id`.
- Platform Super Admin can access platform-wide data.
- School users can only access their own school data.
- Parent users can only access linked children.
- Student users can only access their own allowed data.
- Every query for school-owned data must enforce tenant scope.
- Imports, exports, reports, dashboards, and search must also enforce tenant scope.
- Never trust a `school_id` from the frontend without server-side authorization.

## Auth And Permission Rules

- Use role-based access control.
- Support module-level and action-level permissions.
- Common actions: view, add, edit, delete, approve, export, print, publish, collect payment, download documents.
- Support school employee roles such as Principal, Accountant, Class Teacher, Subject Teacher, Receptionist, Librarian, Transport Manager, Hostel Warden, and Custom Role.
- Sensitive permissions must be explicit for fees, salary, documents, medical records, and parent contact numbers.
- Permission restrictions may apply by class, section, subject, branch, department, assigned students, or assigned responsibilities.
- Critical actions should support approval workflows where needed.

## Security Rules

- Treat student, parent, staff, medical, fee, salary, and document data as sensitive.
- Store secrets only in environment variables.
- Do not commit real credentials.
- Use strong password policy and account lock/session controls where applicable.
- Support optional two-factor authentication later.
- Log login history, failed login attempts, permission changes, billing changes, and data changes.
- Exports must be permission-controlled.
- File uploads must validate file type, size, ownership, and visibility.

## Web App Rules

- Build an actual ERP interface, not a marketing landing page.
- Prioritize dense, clear, operational screens.
- Use consistent layout: sidebar navigation, topbar, page title area, content workspace.
- Use tables for lists, forms for editing, dialogs/drawers for focused actions, and dashboards only where useful.
- Every screen should include loading, empty, error, and permission-denied states.
- Navigation must respect permissions.
- The UI must work on desktop, tablet, and mobile browser.
- Text must not overflow buttons, cards, tables, or panels.
- Do not create decorative layouts that slow down school operations.

## API And Web Parallel Workflow

For each module:

1. Define database tables.
2. Define permissions.
3. Build backend API.
4. Add backend tests for core behavior.
5. Build web screens using the API.
6. Verify role/permission behavior from both backend and frontend.
7. Update `workflow.md` with completed and remaining work.

Do not build frontend screens using fake assumptions if the backend contract is already available. If mock data is needed temporarily, label it clearly and replace it as soon as the API exists.

## Brand Rules

Source file: `Schoollid_Brand Guideline.pdf`

Brand name:

- Use `SchoolLID`.
- Do not write inconsistent names such as `Schoollid`, `schoollid`, or `School Lid` in product UI unless referring to the PDF filename.

Brand personality:

- Calm.
- Intelligent.
- Trustworthy.
- Future-ready.
- Human.
- Operationally efficient.

Brand mission summary:

- Give schools technology that helps them run better and gives educators more time to teach.

Brand audience:

- School owners.
- Principals.
- Administrators.
- Teachers.
- Parents.

## Color Rules

Primary colors from the brand guide:

- Deep green: `#254f45`
- Dark green: `#0f3a31`
- Lime accent: `#d7d400`

Secondary colors from the brand guide:

- Green: `#56aa3a`
- Warm cream: `#f9e4b9`
- Near black: use `#111111`

Note: The PDF text extraction lists near black as `#11111`, which appears to be missing one digit. Use `#111111` unless the brand file is corrected.

Usage rules:

- Use deep green and dark green for primary navigation, headers, brand surfaces, and key actions.
- Use lime accent carefully for highlights, status emphasis, selected states, or important callouts.
- Use warm cream as a soft background or secondary surface, not as the only dominant UI color.
- Use near black for primary text.
- Do not make the ERP UI a one-color green interface. Use neutrals, spacing, and hierarchy so data remains readable.
- Avoid gradients in icons.

### Surface Scope: Public vs Admin

The green brand palette above is the SchoolLID identity and is used for all public and pre-login surfaces: the marketing homepage, the login page, and any public/brand pages.

The authenticated School Admin panel (and other internal admin dashboards) uses a separate, approved "Editorial / Prestige" working palette for a calmer, denser operational feel. This is intentional and must be kept consistent:

Admin panel colors:

- Navy ink (primary): `#131C3D` — text, dark tiles, avatars. Lifted `#24315C`, deepest `#0A1024`.
- Sidebar surface: vertical navy gradient `linear-gradient(180deg, #0A1024 0%, #131C3D 60%, #1B2748 100%)`.
- Saffron accent (primary actions, active nav, highlights): `#EE6A2C`. Light `#F2854E`, dark `#C9501A`.
- Gold (prestige, ranks, emphasis, status badges): `#D6991F`. Light `#F2C84B`, dark `#B45309`.
- Warm paper background: `#FBF6EC`. Deeper paper surface (panels/cards): `#F3E9D6`. Cards may also be white.
- Supporting: royal blue `#2C49A6`, success/emerald `#168A66`, danger `#DC2626`.
- Hairlines/borders: navy at low alpha, e.g. `rgba(19, 28, 61, 0.12)`.

Admin panel usage rules:

- Keep this palette scoped to the admin/authenticated area only. Do not leak saffron/navy into public brand surfaces, and do not leak brand green into the admin panel.
- Implementation: the admin scheme is applied by overriding the brand color tokens within a scoped `.admin-theme` wrapper (see `webapp/src/features/admin/admin-theme.css`), so global brand tokens stay green. Re-theme by editing those scoped variables, not by changing the global tokens.
- Use navy for primary text and dark surfaces, saffron for primary/active actions, gold for prestige and status emphasis, and warm paper/white for backgrounds and panels.

## Typography Rules

Brand fonts from the guide:

- Playfair Display: headings.
- Poppins: body and UI.

Implementation rules:

- Use Poppins for most ERP UI text, forms, tables, buttons, filters, and navigation.
- Use Playfair Display sparingly for brand-heavy headings, public pages, or large page identity moments.
- Do not use oversized marketing typography inside dense admin panels.
- Do not use negative letter spacing.
- Keep text readable and responsive.

## Logo Rules

Logo restrictions from the guide:

- Do not stretch or distort the logo.
- Do not recolor the logo.
- Do not rotate the logo.
- Do not add drop shadow.
- The app icon/social icon use case is allowed.
- The icon-only mark should not be used for print media.
- On dark backgrounds, use the approved dark-background logo treatment.

Implementation rules:

- Keep logo placement clean with enough breathing room.
- Do not recreate the logo in CSS or SVG unless the actual brand asset is unavailable and the user asks for a temporary placeholder.
- Use the real logo asset when it becomes available in the repository.

## Icon Rules

From the brand guide:

- Use solid fill based icons.
- Do not use outline based icons.
- Icons must be solid color.
- Do not use gradients in icons.

Implementation rules:

- Prefer a consistent icon library for the web app.
- If using an icon library that defaults to outlines, configure or choose filled icons where possible.
- Icons should support the task, not decorate the interface.

## Accessibility And UX Rules

- Maintain sufficient contrast.
- Forms must have labels.
- Errors must be clear and near the relevant field.
- Confirmation is required for destructive or critical actions.
- Tables need search/filter/pagination when data can grow.
- Use status badges for states such as active, inactive, pending, approved, rejected, paid, unpaid, overdue, published, and draft.
- Show who performed critical actions through audit logs.

## Documentation Rules

- Keep long-term project direction in `workflow.md`.
- Keep strict rules in `PROJECT_RULES.md`.
- When completing a major module, update the completed/remaining sections in `workflow.md`.
- When adding a new important architectural decision, document it.
- Avoid storing temporary brainstorming as permanent rules.

## AI Agent Rules

Before working:

- Read `workflow.md`.
- Read `PROJECT_RULES.md`.
- Check existing files before creating new patterns.
- Continue the current project direction unless the user changes it.

While working:

- Keep backend and frontend contracts aligned.
- Make scoped changes only.
- Do not delete or rewrite existing work without user approval.
- Prefer practical, maintainable implementation over clever abstractions.
- Ask only when a decision is truly blocked.

After working:

- Summarize what changed.
- Mention what was not completed.
- Update `workflow.md` when project status changes.
