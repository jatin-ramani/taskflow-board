# Superworks-grade Redesign Plan

Derived from `source.md` (Projects card-grid), `layout.md` (My Dashboard + shell),
the supplied blue palette, and the "too much empty space / low content" feedback.

## Problem statement
Pages are sparse (Home, My Tasks, Friends, Goals, project list). Superworks packs
each screen with **information-dense widgets, cards, charts, progress, avatars,
and status** — and uses a **blue** identity, not violet. We adopt that.

---

## A. Theme → Superworks blue (replaces violet accent)

Light `:root` tokens:
| token | value |
|---|---|
| accent | `#4F9DFF` |
| accent-hover | `#2F80ED` |
| accent-soft | `#EAF4FF` |
| bg | `#F7FAFF` |
| elevated | `#FFFFFF` |
| surface | `#EEF3FB` |
| border | `#E5EAF2` |
| text | `#1F2937` |
| muted | `#6B7280` |
| faint | `#9AA3B2` |
| success | `#22C55E` |
| danger | `#EF4444` |
| warning/amber | `#F5A623` (light `#FFD166`) |

Dark: keep neutral-dark surfaces, swap accent to `#4F9DFF`. Chat keeps its bubble
styling but inherits the blue accent. Status colors: in-progress=amber, done=green,
overdue=red — used as soft tinted tags (`bg rgba(amber,.1)` + amber text), per Superworks.

## B. Shell / layout (from `u_layout`)
- **Left sidebar** = primary menu (icon + label), active item highlighted. Map our
  routes: Dashboard(Home) · My Tasks · Projects · Calendar · Goals(Milestones) ·
  Timesheet · Reports · Friends · Inbox · Messages · Settings(Profile).
- **Per-page header** = breadcrumb + page title + **filter bar** (Select Project,
  date range, view tabs) + primary action button — fills the dead top space.
- Content uses a max width but **fills** with widget rows, not one narrow column.

## C. Projects → rich card grid (from `source.md`)
Replace the plain list with a **card grid**, grouped **Favourites / All Projects**.
Each card:
- priority color bar (left), **avatar/logo** (40px, colored initials or image),
- **title**, favourite star, ⋯ options,
- **progress**: `xx.x%` + `done / total` + **progress bar** + **status tag**,
- **due date** (calendar icon) + **PM avatar**.
Backend: add to project — `priority`, `dueDate`, `managerId`, `isFavorite`,
status (derive from sections or a field), and computed `done/total` counts.

## D. Home → "My Dashboard" widget grid (from `layout.md`)
Two columns (`left` wide / `right` rail). Widgets (cards with `Title + View All`):
- **KPI row**: Total Projects · Total Tasks · Active · Overdue Tasks · Overdue
  Projects · Completed · Pending · Due Today.
- **Task Activity** (column chart) + **Task Trending** (line) — recharts.
- **Tasks for Today** (list, empty-state "No tasks for today").
- **Milestones** (progress list).
- **Timesheet Activity** (logged-hours chart/list).
- Right rail: **Leaderboard** (avatar + points), **Activities** feed, **Check-ins**.
Backend: a `/api/dashboard` aggregation (counts + series + leaderboard + today).

## E. Fill empty space on every page
- **My Tasks**: add summary KPI strip + group-by + denser table (type/project/
  due/priority/tags), right rail (filters / due-soon).
- **Goals**: progress cards grid + rollup chart; remove vertical emptiness.
- **Friends**: card grid (avatar, @handle, mutuals, message/▸), requests panel,
  suggestions — not a thin list.
- **Inbox**: grouped notifications + filters + denser rows.
- **Project views**: already dense (List/Board/Calendar/Milestones/Dashboard) — align
  to blue + card headers + filter bars.

## F. Shared primitives (to support density)
`WidgetCard` (header w/ title + View-All + body), `KpiCard`, `StatusTag`,
`ProgressBar`, `AvatarStack`, `ProjectCard`, `FilterBar`, `SectionHeader`, `EmptyState`.

---

## Execution order (phased, verify each)
1. **Theme swap to blue** (tokens) + status-tag primitive. *(fast, global)*
2. **Projects card grid** + project model fields (priority/due/manager/favourite) + counts.
3. **Home = My Dashboard** widget grid + `/api/dashboard` aggregation + charts.
4. **My Tasks / Goals / Friends / Inbox** density passes (KPI strips, grids, rails).
5. **Shell**: header filter bars + breadcrumbs; sidebar menu polish.
6. Modals + navbar final polish.

> Awaiting screenshots to pin exact spacing/widget arrangement per page; the above
> follows the provided HTML. Each phase is a working session with e2e verification.
