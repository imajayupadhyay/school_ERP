# SchoolLID — Admin Panel Design System

Reference for building **new School Admin pages** so they match the redesigned panel exactly.
Read this before creating any screen under `webapp/src/features/admin/`. It documents the tokens,
the shared components, the layout recipes, and copy-paste page templates.

> Scope: the authenticated **admin panel only**. Public/marketing/login surfaces keep the green brand
> palette (see `PROJECT_RULES.md`). The admin panel uses the "Editorial / Prestige" navy + saffron
> scheme, applied through the scoped `.admin-theme` wrapper.

---

## 1. Design principles

- **Calm, dense, operational.** Tables for lists, drawers/modals for focused actions, dashboards only where useful.
- **One system, reused.** Never hand-roll a header, tab bar, table action, or empty state — import the shared component.
- **Every screen has 4 states:** loading (skeleton), empty, error (retry), and permission-denied / read-only.
- **Solid-fill icons only** (brand rule). No outline icons, no gradients inside icons.
- **Color is semantic, not decorative.** Saffron = primary/active, red = destructive, green = success/paid, blue = info/view, gold = prestige/emphasis.
- **Text must never overflow** buttons, cards, tables, or panels — truncate with guards.

---

## 2. Color tokens

The admin scheme overrides the brand CSS variables inside `.admin-theme`
(`webapp/src/features/admin/admin-theme.css`). Tailwind v4 utilities read these as variables, so
`bg-accent`, `text-ink`, `border-line`, etc. resolve to the values below automatically.

| Token (Tailwind) | Value | Use |
| --- | --- | --- |
| `ink` | `#131C3D` | Primary text, dark tiles, avatars |
| `ink-soft` | `#24315C` | Header-band gradient end |
| `paper` | `#FBF6EC` | Page background |
| `paper-2` | `#F3E9D6` | Subtle surfaces, avatar gradients |
| `accent` | `#EE6A2C` | **Saffron** — primary actions, active nav/tabs, Edit |
| `accent-2` | `#F2854E` | Saffron light — hover |
| `lime` | `#D6991F` | **Gold** — prestige, ranks, "current", emphasis |
| `line` | `rgba(19,28,61,0.12)` | Hairlines / borders |

**Supporting hexes** (used directly as arbitrary Tailwind values, e.g. `text-[#168a66]`):

| Purpose | Hex |
| --- | --- |
| Success / paid / present | `#168A66` |
| Danger / delete / overdue | `#DC2626` |
| Info / view / royal blue | `#2C49A6` |
| Gold text (on light) | `#B45309` |
| Violet (photo) | `#7C3AED` |
| Teal (transfer) | `#0E7490` |

Keep this palette **scoped to the admin area**. Do not leak saffron/navy into public surfaces, and never
introduce new accent colors without a reason — reuse the table above.

---

## 3. Typography

- **Poppins** for all UI: tables, forms, buttons, filters, nav.
- **Playfair Display** only for large brand moments (rare in the admin panel).
- Page title: `text-[1.7rem] font-extrabold tracking-[-0.02em]`.
- Table header: `text-[0.7rem] uppercase tracking-[0.08em] font-bold text-ink/45`.
- No negative letter spacing beyond the title's `-0.02em`.

---

## 4. Shared components (import these — do not re-create)

### `PageHeader` + `SegmentedTabs` — `features/admin/components/PageHeader.tsx`

```tsx
import { PageHeader, SegmentedTabs, type TabDef } from '../components/PageHeader'

<PageHeader
  icon={StudentsIcon}                 // solid icon component
  title="Students"
  description="Manage admissions, class placement, guardians…"
  actions={canEdit ? <AddButton label="Add Student" onClick={…} /> : undefined}
  aside={<span className="…pill…">{meta.total} students</span>}  // optional, below description
/>
```

`PageHeader` renders the **navy gradient header band** (icon tile + title + description + optional
actions/aside, with soft saffron/gold glow blobs). Use it as the first child of every page.

```tsx
type TabKey = 'a' | 'b' | 'c'
const TABS: TabDef<TabKey>[] = [
  { key: 'a', label: 'First',  icon: CalendarIcon },
  { key: 'b', label: 'Second', icon: EditIcon, count: items?.length },  // count badge optional
]
<SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
```

`SegmentedTabs` is the **modern pill tab control** (rounded white container; active tab = saffron pill
with glow; inactive icon tints saffron on hover; optional count badge). Use it for every tabbed page —
never the old underline tabs.

### Table helpers — `features/admin/components/TableUI.tsx`

| Export | What it is |
| --- | --- |
| `RowAction` | Color-coded icon action button for table rows (see §6) |
| `AddButton` | Saffron primary "Add …" button (plus icon, hover lift + glow) |
| `SecondaryButton` | Paper/outline button for nested add actions |
| `TableSkeleton` | Realistic row-shaped loading skeleton (`rows` prop) |
| `TableErrorState` | Error card with retry (`message`, `onRetry`, `title`) |

```tsx
import { RowAction, AddButton, TableSkeleton, TableErrorState } from '../components/TableUI'
```

### Form + dialog — `features/admin/components/`

- `FormField` + `inputClass` (`FormField.tsx`) — labeled control with inline error; `inputClass` is the
  standard input/select/textarea styling (rounded, `focus:border-accent focus:ring-accent/15`).
- `Modal` (`Modal.tsx`) — `Modal({ title, description?, size?: 'md'|'lg', onClose })`.
- `StatusBadge` (`StatusBadge.tsx`) — pass any status string; it maps to the right tinted pill
  (active/paid/overdue/published/present/pass/…). Extend the map there, don't invent badges.
- `icons.tsx` — the solid-fill icon set. Add new icons here, `fill="currentColor"`, viewBox `0 0 24 24`.

---

## 5. Layout recipes (class strings)

These are the exact Tailwind recipes the redesigned pages use. Match them.

### Filter toolbar

```tsx
<div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
  <div className="mb-3 flex items-center justify-between">
    <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-ink/55">
      <FilterIcon width={16} height={16} className="text-accent" />
      Filters
      {activeFilters > 0 && (
        <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[0.7rem] font-bold text-accent">
          {activeFilters} active
        </span>
      )}
    </div>
    {activeFilters > 0 && (
      <button onClick={resetFilters} className="text-[0.78rem] font-semibold text-ink/45 hover:text-accent">
        Clear all
      </button>
    )}
  </div>
  <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(N,minmax(0,1fr))]">
    {/* search input has an inline SearchIcon; selects use inputClass */}
  </div>
</div>
```

- `activeFilters = [search, status, …].filter(Boolean).length`
- Search input: wrap in `<label className="relative">` with `<SearchIcon className="… absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />` and `className={`${inputClass} pl-9`}`.

### Table

```tsx
<div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
  <table className="w-full min-w-[…] text-left text-[0.85rem]">
    <thead>
      <tr className="border-b border-line bg-paper/60 text-[0.7rem] uppercase tracking-[0.08em] text-ink/45">
        <th className="px-5 py-3.5 font-bold">Column</th>
        <th className="px-5 py-3.5 text-right font-bold">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr className="group border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.035]">
        <td className="px-5 py-3">…</td>
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
            <RowAction label="Edit" onClick={…}><EditIcon width={17} height={17} /></RowAction>
            <RowAction label="Delete" danger onClick={…}><TrashIcon width={17} height={17} /></RowAction>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

- **Avatar tile** (first cell): `grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paper-2 to-paper text-[0.82rem] font-bold text-ink/60 ring-1 ring-line transition group-hover:ring-accent/30`. Show initials or photo.
- Wrap primary text in `truncate`; secondary line `mt-0.5 text-[0.76rem] text-ink/45`.
- Money columns: right-aligned + `tabular-nums`.
- Inline status/type pills: `rounded-full px-2 py-0.5 text-[0.7rem] font-bold` with a tinted bg.

### Pagination

```tsx
<div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[0.84rem] text-ink/55 shadow-sm">
  <span>Showing <b className="text-ink/75">{from}–{to}</b> of <b className="text-ink/75">{total}</b></span>
  <div className="ml-auto flex items-center gap-2">
    <button …prev… className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 font-semibold text-ink/65 hover:border-accent hover:text-accent disabled:opacity-40 …">
      <ChevronLeftIcon width={16} height={16} /> Prev
    </button>
    <span className="px-2 text-[0.8rem] font-semibold text-ink/45">{current_page} / {last_page}</span>
    <button …next…>Next <ChevronRightIcon width={16} height={16} /></button>
  </div>
</div>
```

### Empty state

```tsx
<div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent"><ModuleIcon width={30} height={30} /></span>
  <h3 className="mt-4 text-[1.05rem] font-bold text-ink">No X yet</h3>
  <p className="mt-1 max-w-sm text-[0.86rem] text-ink/50">Context-aware copy (filters vs. truly empty).</p>
  {/* CTA: Clear filters OR Add X */}
</div>
```

### Buttons

- **Primary (saffron):** `rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(238,106,44,.7)] transition hover:bg-accent-2 hover:-translate-y-0.5` — or just use `<AddButton>`.
- **Secondary (outline):** `rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink/65 hover:border-accent hover:text-accent`.
- **Sticky save bar** (long forms): wrap actions in `sticky bottom-4 z-10 … rounded-2xl border border-line bg-white/85 px-4 py-3 shadow-[…] backdrop-blur` with an "unsaved changes" hint on the left.

### Cards / stat tiles

- Card: `rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6`.
- Stat tile with colored dot: a `h-2 w-2 rounded-full` dot in the tone color + uppercase label + `text-[1.5rem] font-extrabold` value. Highlight a key metric with `border-accent/25 bg-accent/[0.06]`.

---

## 6. Row action colors (automatic)

`RowAction` **infers its color from the `label`** — just give it a clear label and the right icon:

| Label contains | Tone | Color |
| --- | --- | --- |
| view, profile, detail, report, open, link, file, children | `view` | blue `#2C49A6` |
| edit (default) | `edit` | saffron |
| delete, archive, remove, void | `danger` | red `#DC2626` |
| photo | `violet` | violet `#7C3AED` |
| transfer | `teal` | teal `#0E7490` |
| assign | `success` | green `#168A66` |
| reset, password, key | `gold` | gold `#B45309` |

Pass `danger` to force red regardless of label, `disabled` to mute it, or `tone="…"` to override.
For **inline** (non-`RowAction`) icon buttons, tint them the same way: `bg-[#2c49a6]/12 text-[#2c49a6] hover:bg-[#2c49a6]/22` (blue example).

---

## 7. Charts (dashboard) — no chart library

Charts are **hand-rolled SVG/CSS** (no recharts/d3). Reuse the dashboard components or follow their pattern:

- `dashboard/components/TrendChart.tsx` — reusable **area + line** chart (`title`, `subtitle`, `points: {label,value}[]`, `color`, `format`, `headline`). Gridlines, gradient fill, dots, tooltips.
- Progress **ring** (donut gauge): two SVG `<circle>`s, `strokeDasharray` = `${(pct/100)*C} ${C-…}`, `transform="rotate(-90 …)"`. See `FeesCard` / `AttendanceCard`.
- **Bars / sparklines:** flex row of `rounded-t-md` divs with `height: %`. See `ClassBarChart`, `AttendanceCard` 7-day bars.
- Rate color thresholds: `>=85 green`, `>=60 gold`, else red.

---

## 8. Conventions

- **Roles / gating:** `const EDITOR_ROLES = ['school_admin','principal','super_admin']` (+ `'teacher'` where teachers act). Compute `canEdit`/`canManage` and gate write actions + show a read-only banner / permission-denied state. The backend enforces it for real — the UI just reflects it.
- **Data:** TanStack Query. List keys like `['students', params]`. For per-tab count badges, run the same `queryKey` at page level (cache-shared, no extra fetch).
- **Money:** `import { formatINR } from '@/features/admin/fees/format'`.
- **Currency / dates:** respect the school profile where relevant.
- **Backend first:** don't invent fields the API doesn't return. Add the aggregate to the service + a feature test, then surface it (see `DashboardService` + `tests/Feature/Dashboard/DashboardTest.php`).
- **Lint/build gate:** `npm run build` (tsc + vite) must pass; new ESLint errors are not acceptable. Use Homebrew PHP 8.5 for backend (`PATH=/opt/homebrew/bin:$PATH php artisan test`).

---

## 9. New page template — list page

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { PageHeader } from '../components/PageHeader'
import { AddButton, RowAction, TableSkeleton, TableErrorState } from '../components/TableUI'
import StatusBadge from '../components/StatusBadge'
import { inputClass } from '../components/FormField'
import {
  ModuleIcon, FilterIcon, SearchIcon, EditIcon, TrashIcon,
  ChevronLeftIcon, ChevronRightIcon,
} from '../components/icons'

const EDITOR_ROLES = ['school_admin', 'principal', 'super_admin']

export default function ThingPage() {
  const { user } = useAuth()
  const canEdit = !!user && EDITOR_ROLES.includes(user.role)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const params = { page, per_page: 15, search: search.trim() || undefined }
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['things', params], queryFn: () => fetchThings(params) })
  const rows = data?.items ?? []
  const meta = data?.meta
  const activeFilters = [search].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ModuleIcon}
        title="Things"
        description="What this module does."
        actions={canEdit ? <AddButton label="Add Thing" onClick={() => {/* open modal */}} /> : undefined}
        aside={meta && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1 text-[0.78rem] font-semibold text-paper ring-1 ring-paper/15">
            <span className="text-lime">{meta.total}</span> things
          </span>
        )}
      />

      {/* Filter toolbar (see §5) */}

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <TableErrorState onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState … />
      ) : (
        <>
          {/* Table (see §5) — rows use RowAction for actions */}
          {/* Pagination (see §5) */}
        </>
      )}
    </div>
  )
}
```

## 10. New page template — tabbed page

```tsx
import { useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { ModuleIcon, CalendarIcon, EditIcon } from '../components/icons'
import { PageHeader, SegmentedTabs, type TabDef } from '../components/PageHeader'

type TabKey = 'one' | 'two'
const TABS: TabDef<TabKey>[] = [
  { key: 'one', label: 'One', icon: CalendarIcon },
  { key: 'two', label: 'Two', icon: EditIcon },
]

export default function ModulePage() {
  const { user } = useAuth()
  const canEdit = !!user && ['school_admin', 'principal', 'super_admin'].includes(user.role)
  const [tab, setTab] = useState<TabKey>('one')

  return (
    <div className="space-y-6">
      <PageHeader icon={ModuleIcon} title="Module" description="…" />
      {!canEdit && <div className="rounded-xl border border-line bg-paper-2/70 px-4 py-3 text-[0.85rem] text-ink/60">Read-only access…</div>}
      <SegmentedTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'one' && <OneTab canEdit={canEdit} />}
      {tab === 'two' && <TwoTab canEdit={canEdit} />}
    </div>
  )
}
```

---

## 11. File map

```
webapp/src/features/admin/
  admin-theme.css                 # scoped color tokens (.admin-theme)
  AdminLayout.tsx                 # collapsible sidebar + topbar shell
  components/
    PageHeader.tsx                # PageHeader + SegmentedTabs + TabDef
    TableUI.tsx                   # RowAction (+ tone logic) + AddButton + SecondaryButton + TableSkeleton + TableErrorState
    FormField.tsx                 # FormField + inputClass
    Modal.tsx                     # Modal
    StatusBadge.tsx               # status → tinted pill
    icons.tsx                     # solid-fill icon set
    Sidebar.tsx / Topbar.tsx
  dashboard/components/           # TrendChart, FeesCard, AttendanceCard, GenderDonut, ClassBarChart, QuickActions, StatCard
  <module>/                       # one folder per module: Page.tsx, api.ts, types.ts, components/
```

**When you add a shared pattern, put it in `components/` and document it here.**
Keep this file in sync whenever the design system changes.
