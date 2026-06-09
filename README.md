# SmartTask — Frontend

Next.js 14 App Router frontend for SmartTask.

## Stack

- **Next.js 14** — App Router, TypeScript
- **shadcn/ui** (Base UI variant) — component library
- **TanStack Query v5** — server state, caching
- **Zustand** + persist — client state (auth, org)
- **@dnd-kit** — drag-and-drop (Kanban board + backlog)
- **axios** — HTTP client with JWT interceptors + auto-refresh
- **Zod + react-hook-form** — form validation
- **sonner** — toast notifications

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
pnpm dev
```

Open `http://localhost:3000`.

## Project structure

```
app/
  (auth)/
    login/           — split-panel login page
    change-password/ — forced password change on first login

  (setup)/
    setup/           — 4-step organisation wizard (one-time)

  (app)/             — auth-guarded, uses AdminSidebar
    dashboard/       — metric cards + recent activity
    projects/
      page.tsx       — project card grid
      new/           — create project (with live preview)
      [id]/
        layout.tsx   — project header + Board/List/Backlog/Sprints tabs
        page.tsx     — Kanban board (dnd-kit multi-column)
        list/        — flat sortable task table
        backlog/     — backlog + sprint management (drag task → sprint)
        sprints/
          page.tsx   — sprint list
          [sid]/     — sprint board (filtered kanban)

  (admin)/           — admin-guarded
    users/           — member table with invite, reset password, activate
    users/new/       — invite member form
    roles/           — role list + create dialog
    roles/[id]/      — permission editor with category toggles
    organization/    — branding + SMTP tabs

components/
  kanban/
    TaskCard.tsx     — sortable card: priority bar, labels, subtask progress, assignee
    TaskDialog.tsx   — two-column detail: subtasks checklist + comment thread
  layout/
    AdminSidebar.tsx — dark sidebar (Linear-style)
  providers/
    QueryProvider.tsx
    OrgThemeProvider.tsx   — fetches org settings, applies CSS custom properties

stores/
  auth.ts            — user, tokens (localStorage: st_access_token, st_refresh_token)
  organization.ts    — org branding

hooks/
  useProjectSocket.ts — opens WS, patches TanStack Query board cache on events

types/
  task.ts            — Task, TaskDetail, SubTask, Comment, Priority
  project.ts         — Project, Column, BoardResponse, ProjectMember
  sprint.ts          — Sprint, BacklogResponse, SprintBoardResponse
  user.ts / role.ts / auth.ts / organization.ts
```

## Auth flow

1. `POST /api/auth/login` → stores `st_access_token` + `st_refresh_token` in `localStorage`
2. axios request interceptor: adds `Authorization: Bearer {token}` header
3. axios response interceptor: on 401 → tries `POST /api/auth/refresh` → retries original request → on failure: clears auth + redirect to `/login`
4. If `must_change_password = true`, redirects to `/change-password` on every route

## Real-time

`useProjectSocket(projectId)` opens `ws://{api}/api/ws/{projectId}?token={access_token}` and patches the `['board', projectId]` TanStack Query cache directly on incoming events — no refetch needed.

## Design system

Linear-inspired dark aesthetic:
- Sidebar: `oklch(0.108 0.012 264)` dark background
- Primary: `oklch(0.541 0.232 264.05)` indigo-600
- Body text: 13px, labels: 12px, helper: 11px
- Inputs: `h-8`, buttons: `h-8`
- Cards: `rounded-xl border border-border/60 bg-card`
- `buttonVariants()` pattern for Link-as-button (shadcn Base UI has no `asChild`)
