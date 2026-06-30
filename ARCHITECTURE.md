# TaskFlow — Architecture & Data Model

> Personal task/goal manager with light social collaboration (friends, sharing, chat).
> Rebuilt from scratch. Goal: a **0-bug, perfect PMS**.

## Locked decisions

| Area | Decision |
|------|----------|
| Real-time | **Server-Sent Events (SSE)** — free, built into Next.js, instant. Polling only as fallback. No paid services. |
| Goals | First-class feature with progress auto-rolled-up from linked tasks. |
| Friend code | 6-char unambiguous `publicId` (no `0/O/1/I/l`) **+** optional user-chosen `@username`. |
| Design | Linear-style: dark, dense, refined, one accent, hairline borders, keyboard-first. |
| Stack | Next.js 16 (App Router) · React 19 · Prisma + MongoDB · NextAuth v5 · Tailwind v4 · zod · dnd-kit. |

## Correctness principles (the "0-bug" contract)

1. **Server-side authorization on every route.** Shared helpers: `requireAuth()`, `requireProjectRole(userId, projectId, minRole)`, `requireFriendship(a, b)`. No UI-only RBAC.
2. **Schema-level uniqueness guards.** `Friendship.pairKey` and DM `Conversation.pairKey` (sorted `minId_maxId`) make duplicates impossible in either direction.
3. **Zod validation on every endpoint**, schemas shared client/server, typed end-to-end.
4. **Transactions** for multi-step writes (accept request, reorder, goal rollup).
5. **Soft deletes** on messages/tasks.
6. **Indexes** on hot paths (`publicId`, `username`, `pairKey`, `projectId`, `recipientId + isRead`).
7. **MongoDB null convention.** Mongo distinguishes a JSON `null` from an absent field, and Prisma's `{ field: null }` filter matches *only* explicit null. So every nullable field we filter on (`deletedAt`, `completedAt`, `parentTaskId`, …) is written as explicit `null` on create — never omitted. Keeps `{ field: null }` filters correct everywhere.

## Data model

See `prisma/schema.prisma` for the authoritative source. Entities:

- **User** — `publicId` (friend code), optional `@username`, `lastSeenAt` (presence).
- **Friendship** — requester/addressee + status (PENDING/ACCEPTED/DECLINED/BLOCKED), `pairKey` unique.
- **Project** / **ProjectMember** — sharing with roles OWNER/ADMIN/EDITOR/VIEWER. `isPersonal` auto-space per user.
- **Section** — ordered board columns within a project (replaces the old Column+status duplication).
- **Task** — subtasks (self-relation), assignee, creator, `watcherIds[]`, optional `goalId`, `completedAt`.
- **Goal** — status, targetDate, `progress` (rolled up from linked tasks).
- **Comment** — with `mentionIds[]`.
- **Conversation / ConversationParticipant / Message** — 1-on-1 (group-ready), `lastReadAt` for unread counts, soft-deletable messages.
- **Notification** — typed, with `entityType`/`entityId` so requests are actionable (Accept/Decline).
- **Activity** — audit trail.

## Real-time (SSE)

- `GET /api/stream` — one long-lived SSE connection per client. Server pushes:
  - `notification` events (friend request, invite, assignment, mention, due)
  - `message` events (incoming chat)
  - `presence` events (friend online/offline)
- Sending stays plain `POST` (`/api/.../messages`, etc.).
- A lightweight in-process event bus fans writes out to connected streams; on reconnect the client refetches missed state (last-event-id / `lastReadAt`).

## API surface (planned)

**Identity / friends**
- `POST /api/auth/register` · NextAuth handlers
- `GET /api/me` · `PATCH /api/me` (name, username, avatar, bio)
- `GET /api/users/search?q=` (by publicId / username / name)
- `GET /api/friends` · `GET /api/friends/requests`
- `POST /api/friends/request` · `POST /api/friends/:id/respond` · `DELETE /api/friends/:id` · `POST /api/friends/:id/block`

**Projects / sections / tasks**
- `GET|POST /api/projects` · `GET|PATCH|DELETE /api/projects/:id`
- `POST /api/projects/:id/members` · `PATCH|DELETE /api/projects/:id/members/:memberId`
- `POST /api/projects/:id/sections` · `PATCH|DELETE /api/sections/:id` · reorder
- `GET|POST /api/tasks` · `GET|PATCH|DELETE /api/tasks/:id` · `POST /api/tasks/reorder`
- `POST /api/tasks/:id/comments` · watchers

**Goals**
- `GET|POST /api/goals` · `GET|PATCH|DELETE /api/goals/:id` · link/unlink tasks

**Chat / notifications / stream**
- `GET /api/conversations` · `POST /api/conversations` (find-or-create DM)
- `GET|POST /api/conversations/:id/messages` · `POST /api/conversations/:id/read`
- `GET /api/notifications` · `POST /api/notifications/read`
- `GET /api/stream` (SSE)

## Build roadmap & progress

- ✅ **Phase 0 — Reset & foundation:** new Prisma schema, design tokens, Linear-style UI kit, authz/validation/id helpers.
- ✅ **Phase 1 — Identity:** register (publicId + Personal project), login, NextAuth session, dashboard.
- ✅ **Phase 2 — Social graph:** user search, friend requests, accept/decline, notifications, app shell (sidebar/inbox/toasts).
- ✅ **Phase 3 — Work core:** projects, sections, tasks, board (DnD) + list views, task detail panel, My Tasks, server-side RBAC.
- ✅ **Phase 4 — Sharing:** add friends to projects with roles (Admin/Editor/Viewer), Members dialog, role enforcement, shared visibility.
- ✅ **Phase 5 — Goals:** goal CRUD, progress rollup from linked tasks, goals page + detail dialog, task↔goal linking.
- ✅ **Phase 6 — Chat:** 1-on-1 conversations (find-or-create by pairKey), message history, unread counts, Messages two-pane UI.
- ✅ **Phase 7 — Real-time:** SSE bus (`lib/realtime.ts`) + `/api/stream`; live messages, notifications, and presence (online/last-seen). Free, in-process.
- ⬜ **Phase 8 — Polish & QA:** edge cases, 0-bug hardening. **← core app feature-complete; only polish remains**

## Resume notes (core app complete through Phase 7)

- **Demo accounts** (password `password123`): `alice@test.com` (has 2 seeded projects, 11 tasks, 1 goal), `bob@test.com` (friends with Alice). Use both to test friends/sharing/chat.
- **Dev server:** `npm run dev` then http://localhost:3000. **Never run `next build` while dev runs** (corrupts dev CSS cache) — verify with `npx tsc --noEmit` instead. After CSS changes, hard-refresh (Ctrl+Shift+R).
- **Design:** dark warm palette, violet accent (#7c5cff). Base reset lives in `@layer base` (must stay there or it overrides Tailwind utilities).
- **MongoDB null rule:** write nullable filter-fields (`deletedAt`, `completedAt`, `parentTaskId`) as explicit `null` on create.
- **Real-time:** one SSE connection per client via `<Realtime/>` (mounted in `(app)/layout`). Server bus is `lib/realtime.ts` (in-process, pinned to globalThis). Publishers: `createNotification` and the message POST route call `publishToUser`. Client re-broadcasts as the `taskflow:realtime` window event; subscribe with `onRealtime(...)`. Pages keep a slow fallback poll behind SSE.
- **Next: Phase 8 (optional polish).** Core app is feature-complete. Possible: profile/avatar editing (Cloudinary already wired), @username editing, mentions autocomplete in comments, project settings (rename/delete/color), keyboard shortcuts, mobile responsiveness pass, empty-state polish.
