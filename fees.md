# Fees & Payment Management — Module Documentation

> Built: 2026-06-11 · Module: School Admin Panel, Phase 3 item 9
> Stack: Laravel 12 API (`backend-api/`) + React/Vite/TS (`webapp/`), single shared MySQL DB with `school_id` tenant scoping.

This document records everything built in this session: what the module does, the data model, how the billing engine works, the API, the web UI (and exactly where each feature lives), the demo data, the tests, and the known limitations / future work.

---

## 1. What this module does

A complete, multi-tenant **school fee system** with a real instalment billing engine:

1. **Fee Heads** — the fee components a school charges (Tuition, Transport, Admission, Exam, Library, Sports…).
2. **Fee Structures** — named fee plans per academic session + class, bundling several heads, each with its own **amount** and **frequency**.
3. **Student assignment** — assign a structure to a student. The structure's lines are **snapshotted** onto the student, so later structure edits never change an already-assigned student's dues. Per-student **discounts** and **custom one-off fees** live here.
4. **Invoices / instalments** — generated automatically from each fee's frequency across the academic-session window, with due dates and statuses.
5. **Payments / collection** — collect against invoices, with **partial payments**, multiple **payment modes**, sequential **receipt numbers**, and **voiding**.
6. **Per-student custom plan editor** — add/remove any fee, include optional fees, change amounts/frequency/discounts at any time, with **payment-safe regeneration**.

It plugs into student admission (assign a plan from the student create/edit modal) and has its own operational pages under `/admin/fees`.

---

## 2. Architecture — 8 tables

All tables are tenant-scoped via the `App\Models\Concerns\BelongsToSchool` trait (auto-filters every query by the authenticated user's `school_id` and auto-stamps it on create).

```
fee_heads ───────────────┐ (Tuition, Transport, Admission…)
                         │
fee_structures ──< fee_structure_items >── fee_heads
  (per session + class)      (head + per-occurrence amount + frequency)
        │
        │ assign + SNAPSHOT
        ▼
student_fee_assignments ──< student_fee_items >── fee_heads
  (1 active per student/session)   (snapshotted line: base amount, frequency,
                                    discount_type/value/reason, is_custom, is_optional)
        │ generate
        ▼
fee_invoices ──< fee_invoice_items >── fee_heads
  (one per period: invoice_no, due_date, total, paid, status)
        │
        ▼
fee_payments  (receipt_no, amount, mode, ref, collected_by → allocated to an invoice)
```

Migrations: `backend-api/database/migrations/2026_06_11_100000…100007_*` (one per table).

| Table | Purpose | Key columns |
|---|---|---|
| `fee_heads` | Fee components | `name`, `code`, `is_optional`, `status` |
| `fee_structures` | Per session+class plan (class-wide when `class_id` null) | `academic_session_id`, `class_id`, `name`, `status` |
| `fee_structure_items` | Lines inside a structure | `fee_head_id`, `amount`, `frequency`, `is_optional` |
| `student_fee_assignments` | A student's active plan for a session | `student_id`, `academic_session_id`, `fee_structure_id`, `status` |
| `student_fee_items` | Snapshotted per-student lines (+ discounts, custom) | `label`, `base_amount`, `frequency`, `discount_type/value/reason`, `is_custom`, `is_optional` |
| `fee_invoices` | Generated instalments | `invoice_no`, `period_label`, `due_date`, `total_amount`, `paid_amount`, `status` |
| `fee_invoice_items` | Per-head breakdown of an invoice | `fee_head_id`, `label`, `amount` |
| `fee_payments` | Collection ledger | `receipt_no`, `amount`, `mode`, `reference_no`, `paid_on`, `collected_by`, `status` |

Models live in `backend-api/app/Models/`: `FeeHead`, `FeeStructure`, `FeeStructureItem`, `StudentFeeAssignment`, `StudentFeeItem`, `FeeInvoice`, `FeeInvoiceItem`, `FeePayment` (plus `Student` gained `feeAssignments()` / `feeInvoices()` relations).

---

## 3. Core concepts (how it works)

### Snapshot principle
Assigning a structure **copies** its items into `student_fee_items`. From then on the student's dues are independent of the structure. Editing a structure later only affects **future** assignments — never students already assigned. This prevents silently changing collected/owed amounts.

### Amount semantics — per occurrence
`amount` (on structure items and student items) is the amount **per occurrence**, not an annual total. Frequency decides how many times it is billed:

| Frequency | Invoices generated across a 12-month session |
|---|---|
| `monthly` | one per session month (12) |
| `quarterly` | every 3rd month from session start (4) |
| `half_yearly` | every 6th month (2) |
| `annual` | once |
| `one_time` | once |

So `Tuition ₹2,000 monthly` = ₹2,000 every month (₹24,000/yr). Switching it to `quarterly` = ₹2,000 every quarter (₹8,000/yr) — it does **not** divide an annual total. (Splitting a fixed annual total into N instalments is a separate, not-yet-built feature — see §10.)

### Instalment generation
`InvoiceGeneratorService` reads the academic session's `start_date`/`end_date`, builds the list of months, then expands each (non-optional) fee item across the months per its frequency. All charges landing in the same month are **merged into one invoice** with a per-head line breakdown. Due date defaults to the 10th of the period month. Numbers are sequential per school: `INV-{school}-{n}` and `RCP-{school}-{n}`.

### Overdue is derived, not stored
An invoice is **overdue** when `balance > 0 && due_date < today` (computed in the model/resource). Stored statuses are only `pending | partial | paid | cancelled`.

### Payment-safe regeneration (the important one)
When a student's plan is edited, the generator does **not** wipe everything:
- Invoices that already have **collected money** (paid or partial) are **preserved untouched**.
- Only the **unpaid / upcoming** months are rebuilt from the new item set.
- One-time / annual fees **anchor to the first still-open month**, so a fee added mid-year still gets billed even if month 0 is already paid.
- A one-off that was **already paid is never billed twice** (the generator checks each preserved invoice's line identities).

This means an admin can add an optional fee, add a custom charge, or change a discount **at any time during the year** without disturbing what's already been collected.

### Discounts
Per fee line: `discount_type` = `none | percent | fixed`, with `discount_value` and an optional `discount_reason` (e.g. "Sibling concession"). `net_amount = base − discount` is applied per occurrence. Discounts can target individual heads (e.g. waive transport only).

---

## 4. Backend layer

Located under `backend-api/app/`. Conventions mirror existing modules (Students/Guardians).

- **Services** (`app/Services/Fees/`) keep controllers thin:
  - `InvoiceGeneratorService` — expands items → invoices; payment-safe regeneration; sequential numbering.
  - `FeeAssignmentService` — snapshot + assign, edit items, reassign/cancel. Reassigning to a *different* structure is still blocked when payments exist (you must void first); editing the *current* plan's items is always allowed (payment-safe).
  - `FeePaymentService` — records/voids payments, allocates to an invoice, recomputes `paid_amount` + status (`pending`/`partial`/`paid`), generates receipt numbers.
- **Controllers** (`app/Http/Controllers/Api/V1/Fees/`): `FeeHeadController`, `FeeStructureController`, `StudentFeeController`, `FeePaymentController`, `FeeController` (Collections roster).
- **Form Requests** (`app/Http/Requests/Fees/`): validation + role authorization; all cross-references are school-scoped.
- **Resources** (`app/Http/Resources/Fees/`): JSON serialization; expose derived `balance` / `is_overdue` / `net_amount`.
- **Audit**: every mutation is written via `App\Support\AuditLogger` (`fee_head.*`, `fee_structure.*`, `student_fee.*`, `fee_payment.*`).
- **Permissions**: writes are gated to `school_admin` / `principal` / `super_admin`. Other roles (e.g. `teacher`) get read-only (200 on list, 403 on writes). A dedicated **Accountant** role is future work (see §10).

---

## 5. API reference

All under `/api/v1`, Sanctum bearer auth. Registered in `backend-api/routes/api.php`.

### Fee heads
```
GET    /fee-heads                 list (?search= &status=)
POST   /fee-heads                 create
GET    /fee-heads/{feeHead}       show
PUT    /fee-heads/{feeHead}       update
DELETE /fee-heads/{feeHead}       delete
```

### Fee structures
```
GET    /fee-structures            list (?search= &academic_session_id= &class_id= &status=)
POST   /fee-structures            create (body includes items[])
GET    /fee-structures/{id}       show
PUT    /fee-structures/{id}       update (replaces items[])
DELETE /fee-structures/{id}       delete
```
Each `items[]` entry: `{ fee_head_id, amount, frequency, is_optional? }`.

### Student plans + collection
```
GET    /fees/students                       Collections roster (billed/paid/outstanding/overdue per student)
                                            (?search= &class_id= &section_id= &status=)
GET    /fees/students/{student}             plan + items + invoices + summary
POST   /fees/students/{student}/assign      assign a structure {fee_structure_id, discount_type?, discount_value?, custom_items?[]}
PUT    /fees/students/{student}/items       replace the student's fee lines (payment-safe regenerate)
POST   /fees/students/{student}/cancel      cancel plan (unpaid invoices cancelled)
```
`PUT .../items` body: `items[]` of `{ fee_head_id?, label, base_amount, frequency, discount_type?, discount_value?, discount_reason?, is_custom?, is_optional? }`.

### Payments
```
GET    /fee-payments                 list (?search= &student_id= &mode= &status= &from= &to=)
POST   /fee-payments                 collect {fee_invoice_id, amount, mode, reference_no?, paid_on?, remarks?}
GET    /fee-payments/{feePayment}    show
POST   /fee-payments/{feePayment}/void  void a payment (reverses allocation)
```
Payment modes: `cash | cheque | online | card | upi | bank_transfer`. Overpayment (amount > invoice balance) is rejected with 422.

---

## 6. Web UI — where everything is

Routed at `/admin/fees` (`webapp/src/features/admin/fees/`). Sidebar "Fees" item enabled. Tabbed page (`FeesPage.tsx`):

### Tab 1 — Collections (`components/CollectionsTab.tsx`)
The operational screen. A roster of students with **search + class filter + pagination**, showing **Billed / Paid / Outstanding** and a status badge (paid / pending / overdue / no plan). Each row → **"Manage"** opens the **StudentFeeDrawer**.

### Tab 2 — Fee Structures (`components/StructuresTab.tsx`)
List of structures (filter by session/class) + create/edit modal. The modal has a **dynamic line-item builder** with labeled columns: **Fee Head · Amount · Frequency** (+ add/remove lines). This is where you set the default frequency and amount per fee for a class.

### Tab 3 — Fee Heads (`components/FeeHeadsTab.tsx`)
Simple CRUD table + modal for the fee components (name, code, optional flag, status).

### Student fee drawer (`components/StudentFeeDrawer.tsx`)
Opened from Collections → Manage. Shows:
- **Summary** cards: Billed / Collected / Outstanding / Overdue.
- **Fee Plan** items (with discount + custom badges).
- **Instalments** table — each unpaid invoice has a **Collect** button.
- **Payment history** with **Void**.
- For students **without** a plan: an **Assign a Fee Plan** panel (pick structure + discount).
- **"Edit plan"** button → the full per-student editor (below).

### Collect Payment modal (`components/CollectPaymentModal.tsx`)
Pick amount (defaults to balance, partial allowed), mode, reference, date, remarks → records the payment and shows the receipt number.

### Per-student plan editor (`components/PlanEditorModal.tsx`)
The complete custom-plan editor. Row-based, labeled columns: **Fee Head · Label · Amount · Frequency · Discount · Value · Bill**. You can:
- **Add any fee** — pick a fee head (optional heads are marked "(optional)") or choose **"Custom fee…"** and type a free label.
- Set **amount**, **frequency**, and a **per-line discount**.
- Tick/untick **Bill** — ticking an optional fee turns it on for that student; unticking holds a line without charging it.
- Live "Billed per cycle" total. **Save** regenerates invoices payment-safely.

### Student admission integration (`features/admin/students/StudentPage.tsx`)
The Add/Edit Student modal has an optional **Fee Plan** section: pick a structure (filtered to the student's class + school-wide) and an optional discount; on save the plan is assigned and invoices generated in one flow. On edit it only reassigns if a structure is actively chosen.

`StatusBadge` was extended with `paid / partial / pending / overdue / cancelled` styles.

---

## 7. Typical workflows

**Set up fees for a class**
1. Fees → **Fee Heads**: add Tuition, Transport, Admission, Exam, Library, Sports.
2. Fees → **Fee Structures** → Add: choose session + class, add lines (Tuition ₹2,000 Monthly, Admission ₹5,000 One-time, Exam ₹1,500 Quarterly, …).

**Assign + bill a student**
3. Either from **Add/Edit Student → Fee Plan**, or **Collections → Manage → Assign**. Invoices are generated immediately.

**Collect a fee**
4. Collections → **Manage** → **Collect** on an invoice → enter amount/mode → receipt issued. Partial payments flip the invoice to `partial`.

**Customise a single student (optional/custom fees, change amount/frequency/discount)**
5. Collections → **Manage** → **Edit plan** → add/edit lines (turn on optional fees, add custom charges, change amounts) → **Save**. Paid invoices are preserved; unpaid/upcoming ones rebuild.

---

## 8. Demo data

`backend-api/database/seeders/DemoSchoolSeeder.php` seeds (idempotently): 6 fee heads, one structure per class (Tuition monthly + Transport monthly + Admission one-time + Exam quarterly + Library annual + Sports optional), 24 assigned plans (every 5th student gets a 10% sibling concession), generated invoices, and sample full/partial payments. A fresh `php artisan migrate:fresh --seed` yields ~288 invoices / ~48 payments with mixed paid/partial/pending statuses.

Demo login: school code `Demo`, `demo@gmail.com` / `Demo@123`.

---

## 9. Tests & verification

- Backend: `backend-api/tests/Feature/Fees/FeeManagementTest.php` — **21 tests**, full suite **75/75 passing**. Covers: fee-head/structure CRUD + uniqueness + role checks, instalment counts per frequency, optional-item exclusion, discount math, custom lines, reassignment, partial/full payment + sequential receipts, overpayment rejection, payment void, **payment-safe editing** (preserve paid / rebuild unpaid / anchor mid-year one-offs / never double-bill a paid one-off / turn an optional fee on), and tenant isolation.
- Frontend: `npm run build` clean (193 modules, no TS errors).
- Live curl smoke test against the demo school: login → roster aggregates → student plan → partial payment → overpayment 422 → teacher 403 on writes / 200 read → edit plan to add optional + custom fee and confirm regeneration.

Run them:
```
cd backend-api && PATH=/opt/homebrew/bin:$PATH php artisan test --filter=FeeManagementTest
cd webapp && npm run build
```

---

## 10. Known limitations & future work (out of scope this session)

- **Payment-plan split** — entering a fixed *annual total* and letting it be split into N equal instalments (Annual / Quarterly / Monthly chosen per student). Today, amount is **per occurrence**, not a divided annual total.
- **Parent/Student self-service** — parents/students choosing/paying fees themselves. The Parent and Student portals are not built yet (later phases); fees are admin-controlled only.
- **Printable PDF receipts** and emailed receipts.
- **Fee reminders / notifications** for due/overdue invoices.
- **Late-fee fines** auto-applied after due date.
- **Online payment gateway** integration.
- **Bulk operations** — assign a structure to a whole class at once; bulk invoice regeneration.
- **Dedicated Accountant role** — collection is currently gated to `school_admin` / `principal` / `super_admin` until full RBAC lands.
- **Fee reports / exports** — belong to the Reports module (Phase 3 item 13).

---

## 11. File map (quick reference)

Backend (`backend-api/`):
- `database/migrations/2026_06_11_100000…100007_*`
- `app/Models/Fee*.php`, `StudentFee*.php`
- `app/Services/Fees/{InvoiceGeneratorService,FeeAssignmentService,FeePaymentService}.php`
- `app/Http/Controllers/Api/V1/Fees/*Controller.php`
- `app/Http/Requests/Fees/*Request.php`
- `app/Http/Resources/Fees/*Resource.php`
- `routes/api.php` (fee routes)
- `database/seeders/DemoSchoolSeeder.php` (fee seeding)
- `tests/Feature/Fees/FeeManagementTest.php`

Frontend (`webapp/src/features/admin/fees/`):
- `types.ts`, `api.ts`, `format.ts`, `FeesPage.tsx`
- `components/{CollectionsTab,StructuresTab,FeeHeadsTab,StudentFeeDrawer,CollectPaymentModal,PlanEditorModal}.tsx`
- plus `features/admin/students/StudentPage.tsx` (Fee Plan section) and `features/admin/components/{Sidebar,StatusBadge}.tsx`
- route added in `webapp/src/App.tsx`
