# TaskFlow → "2-in-1": Microsoft Teams (chat) + Superworks (PMS)

Goal: a single premium workspace that combines a **Teams-style chat** and a
**Superworks-style project management system**, with a clean, professional,
minimal-roundness design (light + dark).

This is a large multi-phase effort. Below is the full plan broken into **tracks →
phases → tasks**, with a recommended sequence. We execute one phase at a time.

---

## 0. Design foundation (premium, both worlds)

The unified shell mirrors what *both* Teams and Superworks use: a **narrow left
icon rail** + contextual content + global top bar (search — done).

- [ ] D1. Narrow icon rail (Home/Dashboard, My Tasks, Projects, Chat, Goals, Friends, Inbox), tooltips, active states
- [ ] D2. Per-project top bar with view tabs (List · Board · Calendar · Gantt · Activities · Milestones · Docs) — Superworks-style
- [ ] D3. Shared primitives: data table, segmented filters, field toggles, status pills, avatar stacks, empty states
- [ ] D4. Minimal roundness + spacing audit on every page (home, profile, friends, goals, dashboard)
- [ ] D5. Light theme polish to match Superworks' clean look; dark = Teams

---

## TRACK A — Chat (Microsoft Teams parity)

### Phase A1 — Conversation management (quick wins)
- [ ] A1.1 Rename group
- [ ] A1.2 Change group icon/avatar (Cloudinary upload)
- [ ] A1.3 Conversation context menu (⋯): **mute/unmute**, **pin to top**, **add to Favorites**, **leave** (group), **clear history**, delete chat
- [ ] A1.4 Conversation list **sections**: Favorites · Groups · Direct (collapsible) — like Teams
- [ ] A1.5 Open a person's **profile popup** (avatar click → card: name, @handle, bio, presence, friend code, "Message")

### Phase A2 — Messaging power features
- [ ] A2.1 **Pin message** + pinned banner in the thread header
- [ ] A2.2 **Media full-screen viewer** (lightbox, prev/next, download)
- [ ] A2.3 Reply / quote a message
- [ ] A2.4 @mentions inside chat + mention notifications
- [ ] A2.5 Read receipts ("seen") + typing indicator (SSE)
- [ ] A2.6 File attachments (any type, not just images)

### Phase A3 — Privacy / ephemeral
- [ ] A3.1 **Disappearing chat** (temp messages auto-expire — per-conversation toggle)
- [ ] A3.2 **Remove/clear history** (per-user clear)

---

## TRACK B — PMS (Superworks parity)

### Phase B1 — Data model expansion (schema)
- [ ] B1.1 Task: `taskType`, custom `status`, `estimateMinutes`, `billable`, `followerIds[]`, planned dates
- [ ] B1.2 `Milestone` model (per project)
- [ ] B1.3 `Tag` model (managed, colored) + task↔tag
- [ ] B1.4 `TimeLog` model (start/stop, duration, note) for work logs/timesheets
- [ ] B1.5 `Checklist` items on tasks; task `dependencies[]`
- [ ] B1.6 Per-project custom statuses/sections (Backlog · To Do · On Hold · In Progress · QA · ReOpen · Done)

### Phase B2 — Project views
- [ ] B2.1 **List view** = data table: columns (Assignee, Due, Type, Milestone, Status, Tags, Estimation, Work logs), grouped by section, inline edit, sort, filter, field toggle, group-by
- [ ] B2.2 **Kanban** enhanced (section columns + add column, card meta, drag — have base)
- [ ] B2.3 **Calendar** (tasks by due date, month view)
- [ ] B2.4 **Gantt** (timeline by start/due)
- [ ] B2.5 **Activities** feed (per project)
- [ ] B2.6 **Milestones** view
- [ ] B2.7 **Documents** (project attachments)

### Phase B3 — Task detail (Superworks-style)
- [ ] B3.1 Rich left fields panel (assignee, dates, type, billing, milestone, status, tags, dependencies, planned, hold reason, description with toolbar)
- [ ] B3.2 Right tabs: Activities · Work Log · Approval · Planner
- [ ] B3.3 Subtasks + Checklist tabs
- [ ] B3.4 Start/stop timer → work logs

### Phase B4 — Dashboards & analytics (recharts — already a dep)
- [ ] B4.1 Global dashboard cards: Total/Completed/Open/Overdue/Due-today, estimation hrs, work-log hrs (+ "My" variants)
- [ ] B4.2 Charts: tasks by assignee · priority · creator · type · status · tags
- [ ] B4.3 Leaderboard, task-activity-over-time, today's tracked tasks
- [ ] B4.4 Per-project dashboard

### Phase B5 — Time tracking
- [ ] B5.1 Timer + work logs + timesheet view

---

## Recommended sequence
1. **A1** (chat conversation mgmt + profile popup) — incremental, builds on existing chat
2. **A2** (pin, lightbox, reply) + **A3** (disappearing/clear)
3. **B1 + B2.1/B2.2** (PMS model + List table + Kanban) — the big PMS foundation
4. **B3** (task detail) + **B4** (dashboards)
5. **D** design polish woven throughout

Each phase is its own working session with verification. Premium design + minimal
roundness applied as we build each surface.
