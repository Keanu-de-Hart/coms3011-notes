# Prompt pack (copy-paste into Qoder Agent mode)

Rules of use:
- **One prompt = one new Qoder chat.** AGENTS.md carries the rules, so old context isn't needed. Small context = faster, fewer stray edits.
- Paste the brief's own **Done when** sentence into each feature prompt. If tomorrow's wording differs from the labs, use tomorrow's.
- After each prompt: check it in the browser yourself (`npm run dev`), then `ship "message"`. Never start the next feature on a broken build.

---

## P1: Skeleton (ONLY if you can't copy `templates/`; ~10 min)

```text
Set up the infrastructure only, no UI features. Follow AGENTS.md exactly.
1. src/lib/db.ts: interface Db { query<T>(sql, params?) => Promise<{rows: T[]}>; exec(sql) => Promise<void>; tx<T>(fn: (db: Db) => Promise<T>) => Promise<T> }.
   fromPool(pool) for node-postgres (tx = BEGIN/COMMIT/ROLLBACK on one checked-out client, released in finally).
   fromPglite(pg) for PGlite (exec = pg.exec, tx = pg.transaction).
   getDb(): if DATABASE_URL is set use pg Pool (register pool.on("error", log) so a db restart can't crash the process), else PGlite at .data/pglite (mkdirSync the folder recursively first: PGlite won't).
   Run migrate(db) inside init. Cache the promise on globalThis (dev hot-reload); if init fails, clear the cache so the next call retries.
2. src/lib/migrations.ts: append-only array {id, name, sql}; migrate(db) creates schema_migrations, applies each missing entry in db.tx with db.exec (multi-statement), records it. Migration 1 = tasks table (identity id, title NOT NULL, description, topic, status CHECK IN ('todo','in_progress','complete') DEFAULT 'todo', due_at timestamptz, archived_at timestamptz, created_at, updated_at; index on (archived_at, status, due_at)).
3. GET /api/health (force-dynamic): SELECT 1 → 200 {status:"ok"}, catch → 503 {status:"error"}.
4. next.config.ts: add output "standalone" and serverExternalPackages ["@electric-sql/pglite"].
5. Dockerfile: 3 stages on node:22-alpine (deps: npm ci; build: npm run build; run: copy public, .next/standalone, .next/static, chown node, USER node, ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0, CMD node server.js).
   compose.yml: exactly 2 services. app: build ., env DATABASE_URL=postgres://todo:todo@db:5432/todo and NODE_ENV=production, ports 3000:3000, depends_on db service_healthy, restart unless-stopped. db: postgres:17-alpine, POSTGRES_USER/PASSWORD/DB=todo, named volume pgdata:/var/lib/postgresql/data, healthcheck pg_isready -U todo -d todo, no published port.
   .dockerignore: node_modules .next .git .data coverage *.log .env*
   start.sh: docker compose up -d --build, then poll /api/health with curl up to 2 min, print the URL or the last 50 app log lines.
6. vitest.config.mts with the @ alias → ./src, include tests/**/*.test.ts. One test: fresh new PGlite(), migrate, assert tasks table exists and that migrate twice is a no-op.
Run npm test and npm run build.
```

---

## P2: Core (Lab 1 checkpoint; ~20 min) ⟵ after this you have a passing submission

```text
Build the Core feature set on the existing data layer. AGENTS.md domain rules are non-negotiable.
Repo (src/lib/repo/tasks.ts): listTasks(db, {archived?: boolean, sort?: "topic"|"status"|"due"}), getTask, createTask, updateTask (title, description, topic, due_at, status), archiveTask, unarchiveTask. Every SELECT computes `overdue` in SQL.
Sorting (always add `, id` as final tie-break so order is stable):
 - topic: lower(topic) ASC, due_at ASC NULLS LAST
 - status: CASE status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, then due_at ASC NULLS LAST (not alphabetical!)
 - due: due_at ASC NULLS LAST
UI:
 - "/" active tasks: sort links (?sort=topic|status|due, current one highlighted); each row shows title, topic, status label, due date (local), and a red "Overdue" badge with an icon (not colour alone). Create form with Title (required), Description, Due date (type=date, converted as AGENTS.md says), Topic.
 - "/tasks/[id]": edit all four fields + status <select> with exactly the 3 statuses; Save; Archive button. Shows "Archived" banner + Unarchive if archived.
 - "/archive": archived tasks, each linking to its page, with Unarchive.
 - Top nav: Tasks, Archive.
Tests: archive keeps the row and removes it from the active list; overdue true for past due, false when complete, false for future; each of the 3 sort orders exact (status order todo→in_progress→complete); update persists; status 'overdue' is rejected by the database.
README: Running it, Third-party code (one line why per package), Database design (tables, columns, relationships), Features.
Run npm test and npm run build.
```

**Verify (2 min):** create task with all fields → edit → reload → archive → find it in /archive → past-due task shows Overdue → status dropdown has 3 options → each sort. Then `ship "Core: tasks CRUD, archive, sort, derived overdue"`.

---

## Feature prompts (todo menu): in the recommended order

Template for anything not listed here:

```text
Feature: <NAME> (<code>, <pts> pts)
Spec: <paste the feature paragraph>
Done when: <paste the Done-when sentence>
Design: <your table/route decision in one line>
Scope: a new migration if the schema changes; SQL in src/lib/repo/<area>.ts; UI at <route>. Touch nothing else.
Remember: overdue derived, archive-not-delete, 3 fixed statuses, append-only migrations, no new packages.
Tests: prove the Done-when condition. Run npm test and npm run build.
```

### F1. Activity log + Task history (TH1 6 + TH3 4 = 10 pts): do this FIRST so every later mutation gets logged
```text
Feature: Activity log (TH1) + Task history (TH3).
Done when: every kind of mutation appears in the feed, and archiving a task adds a row rather than removing any. A task edited three times shows three legible entries, in order, naming the fields that changed.
Design: migration: activity_log(id identity, task_id int NULL REFERENCES tasks, action text NOT NULL ('create','update','status','archive','unarchive' and later others), changes jsonb NOT NULL DEFAULT '{}' shaped {field: {old, new}}, created_at timestamptz DEFAULT now()). Index (task_id, created_at) and (created_at).
 - Every mutating repo function runs in db.tx: read the old row, write the change, insert ONE activity_log row with only the fields that actually changed. Add a helper logActivity(tx, taskId, action, changes) in src/lib/repo/activity.ts and use it from every mutation.
 - activity_log is append-only: no UPDATE or DELETE on it anywhere.
 - "/activity": reverse-chronological feed (time, task title link, action, "field: old → new" lines). Nav link.
 - "/tasks/[id]": "History" section, oldest first: timestamp, then one readable line per changed field ("Status: Todo → In-Progress").
Tests: create+update+archive produce 3 rows in order; an update that changes 2 fields logs exactly those 2; archive adds a row and the task row still exists; a failing update writes no log row (transaction).
```

### F2. Seed data (QC3 3 pts): makes every later view look real
```text
Feature: Seed script (QC3).
Done when: one command produces a populated database and the data does not look like "Task 1, Task 2".
Design: src/lib/repo/seed.ts seedDemo(db, n=300) with arrays of realistic titles/verbs/subjects per topic (e.g. topics: Algorithms, Databases, Software Design, Networks, Personal, Admin), due dates spread from -20 to +45 days, mixed statuses, ~10% archived. Goes through the normal repo functions so the activity log fills too. Deterministic (seeded PRNG).
Expose POST /api/seed (force-dynamic) calling seedDemo. Add the npm script: "seed": "node -e \"fetch('http://localhost:3000/api/seed',{method:'POST'}).then(r=>r.text()).then(console.log)\"" so it works for both npm run dev and Docker. Document it in README.
Tests: seedDemo(db, 50) creates 50 tasks, >3 distinct topics, all three statuses present, no title matching /^Task \d+$/.
```

### F3. Priority & effort (DS6 3 pts)
```text
Feature: Priority and effort (DS6).
Done when: sorting by priority then due date gives a stable, correct order.
Design: migration adds tasks.priority smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 0 AND 3) (P0 highest) and tasks.effort smallint NULL CHECK (effort IN (1,2,3,5,8)). Index (priority, due_at).
 - Shown on every list row as a "P0".."P3" chip + effort points, no need to open the task. Editable in create + edit forms (and logged in the activity log).
 - New sort option "priority": priority ASC, due_at ASC NULLS LAST, id. Filters: ?priority=0..3 and ?effort=n on "/".
Tests: priority sort order incl. ties broken by due date then id; filter by priority; CHECK rejects priority 4.
```

### F4. Projects (DS3 4 pts)
```text
Feature: Projects (DS3).
Done when: a project page lists only its own tasks and reports a progress figure that changes as they complete.
Design: migration: projects(id, name text UNIQUE NOT NULL, created_at); tasks.project_id int NULL REFERENCES projects. Index tasks(project_id).
 - "/projects": list with progress "x/y complete (z%)" computed in ONE grouped query (non-archived tasks only). Create project form.
 - "/projects/[id]": only that project's active tasks + progress bar.
 - Project <select> on task create/edit; project name shown on list rows.
Tests: project page query returns only its tasks; progress goes 0/2 → 1/2 after completing one; archived tasks excluded from progress.
```

### F5. Tags (DS2 5 pts)
```text
Feature: Tags (DS2).
Done when: renaming a tag updates every task carrying it, and a two-tag filter returns the intersection.
Design: migration: tags(id, name text UNIQUE NOT NULL, color text NOT NULL DEFAULT '#64748b'), task_tags(task_id REFERENCES tasks, tag_id REFERENCES tags ON DELETE CASCADE, PRIMARY KEY(task_id, tag_id)). Index task_tags(tag_id).
 - "/tags": create, rename, recolour (input type=color), delete tag (deleting a TAG is allowed; tasks are never deleted).
 - Task edit page: toggle tags. List rows show coloured tag chips, loaded for the whole list in ONE query (json_agg), not per task.
 - Filter on "/": ?tags=1,2 (multi-select chips). Intersection SQL: task id IN (SELECT task_id FROM task_tags WHERE tag_id = ANY($1) GROUP BY task_id HAVING count(DISTINCT tag_id) = cardinality($1)).
Tests: rename shows on all tagged tasks; two-tag filter returns only tasks with both; deleting a tag leaves its tasks intact.
```

### F6. Start dates & snooze + Today view (TH5 4 + VW3 4 = 8 pts)
```text
Feature: Start dates and snooze (TH5) + Today view (VW3).
Done when: a task starting tomorrow is absent from Today and present in the full list, and snoozing moves it. Today is empty-stated properly when there is nothing to do.
Design: migration adds tasks.start_at timestamptz NULL (+ index). Start date input on create/edit (type=date, start of that local day).
 - snoozeTask(db, id, days=1): start_at = greatest(now(), coalesce(start_at, now())) + interval '1 day' * days. "Snooze 1 day" button on task page and Today rows. Logged.
 - "/today" (first nav item): three sections in this order: 1) Overdue (most urgent: already late), 2) Due today (in the browser's timezone: pass the user's local day bounds as ISO via query params from a client component or compute bounds client-side), 3) In progress (not already listed). Excludes archived and tasks with start_at > now(). Each section has its own count; when all are empty show a friendly "Nothing to do today 🎉" panel with a link to the full list.
 - Full list "/" still shows not-yet-started tasks with a "Starts <date>" chip.
Tests: task starting tomorrow excluded from today query but in listTasks; snooze moves start_at forward by a day; ordering of sections; empty result returns empty sections (not an error).
```

### F7. Kanban (VW1 7 pts)
```text
Feature: Kanban board (VW1).
Done when: a dragged card is in its new column after a reload, and a failed write reverts the card rather than lying.
Design: "/board": three columns (Todo, In-Progress, Complete), cards show title, topic, due date, Overdue badge, priority/tags if present. Native HTML5 drag-and-drop (draggable + onDragOver/onDrop), NO dnd library. Client component keeps local state; on drop: move optimistically, call a server action setStatus (logged); if it throws or returns error, move the card back and show an error toast. Respects the same filters as "/" (?topic, ?tags, ?priority) read from the URL. Archived tasks never shown.
Add a keyboard fallback: each card has a status <select> too.
Tests: setStatus persists and logs; setStatus to an invalid status throws and leaves the row unchanged.
```

### F8. Statistics (TH4 5 pts)
```text
Feature: Statistics (TH4).
Done when: the figures move correctly after completing a task, and a fresh database renders without crashing.
Design: completion time comes from activity_log rows where action='status' and changes->status->>'new' = 'complete'. src/lib/repo/stats.ts: completionsPerDay(last 30 days, generate_series so empty days are 0), heatmap (last 12 weeks, count of ALL activity per day), currentStreak + longestStreak (consecutive days with ≥1 completion; computed in TS from the per-day series), byTopic (topic, total, complete).
"/stats": inline SVG bar chart + CSS-grid heatmap (no chart library), streak numbers, topic table. Every section shows an empty state with zero data.
Tests: fresh db → all zeros/empty arrays, no throw; completing a task today increments today's count and current streak to 1; byTopic counts.
```

### F9. Appearance settings (QC5 3 pts)
```text
Feature: Appearance settings (QC5).
Done when: the chosen theme survives a restart and neither mode has unreadable text anywhere.
Design: migration: settings(key text PRIMARY KEY, value text NOT NULL). theme: system|light|dark (default system), density: comfortable|compact.
 - Root layout (force-dynamic) reads settings and sets <html class="dark"> when theme=dark, data-density attribute. For theme=system add a tiny inline <script> in <head> that adds "dark" when matchMedia('(prefers-color-scheme: dark)').matches.
 - globals.css: `@custom-variant dark (&:where(.dark, .dark *));` (Tailwind v4) and define body/background/text/border colours for both modes; compact density reduces row padding.
 - "/settings": radio groups saved by a server action. Go through every page and add dark: classes so no text is unreadable.
Tests: setting saved and read back; default is system/comfortable on a fresh db.
```

### F10. iCalendar export (IP2 4 pts)
```text
Feature: iCalendar export (IP2).
Done when: the file opens in an actual calendar application with the right titles on the right dates.
Design: src/lib/ics.ts buildIcs(tasks) (pure function) + GET /api/calendar.ics (force-dynamic, Content-Type text/calendar; charset=utf-8, Content-Disposition attachment; filename=tasks.ics). VCALENDAR VERSION:2.0, PRODID, one VEVENT per non-archived task with a due date: UID:task-<id>@todo-app, DTSTAMP, DTSTART/DTEND in UTC (YYYYMMDDTHHMMSSZ, DTEND = due + 30 min), SUMMARY, DESCRIPTION. CRLF line endings, escape \ ; , and newlines per RFC 5545, fold lines longer than 75 octets.
Add a "Download calendar (.ics)" link in the nav and document the URL http://localhost:3000/api/calendar.ics in README.
Tests: escaping of "a,b;c\d" and newlines; CRLF endings; one VEVENT per eligible task; archived tasks excluded.
```

### F11. Saved views (VW5 4 pts)
```text
Feature: Saved views (VW5).
Done when: a saved view is still there after a restart and reproduces exactly the list it was saved from.
Design: migration: saved_views(id, name text UNIQUE NOT NULL, path text NOT NULL, params jsonb NOT NULL, created_at). path is "/" or "/board" etc.; params = the current URL search params (sort + all filters).
 - "Save view" button on "/" and "/board" (client component reads current URL, asks for a name). Sidebar/nav dropdown lists saved views linking to path?params; delete button (deleting a saved view is allowed).
Tests: save + list round-trips params exactly; delete removes only that view.
```

### F12 (overflow). Dependencies (DS4 8 pts)
```text
Feature: Dependencies (DS4).
Done when: A→B→C→A is rejected on the attempt, not after the fact, and completing B visibly unblocks C.
Design: migration: task_dependencies(task_id REFERENCES tasks, blocked_by_id REFERENCES tasks, PRIMARY KEY(task_id, blocked_by_id), CHECK (task_id <> blocked_by_id)). Index (blocked_by_id).
 - addDependency(db, taskId, blockedById) in db.tx: run a recursive CTE from blockedById following blocked_by edges with a path array and `NOT x = ANY(path)` cycle guard; if it reaches taskId, throw Error naming the path, e.g. "Cycle: A → B → C → A" (use titles). Insert only if no cycle.
 - A task is blocked if any blocker is not complete (derived). setStatus to in_progress/complete on a blocked task throws "Blocked by: <titles>".
 - Task page: "Blocked by" list (with remove) + "Blocks" list + add-blocker select. List/board rows show a 🔒 "Blocked" chip.
Tests: A→B, B→C then C→A rejected with the path in the message; self-dependency rejected; blocked task can't start; completing the blocker unblocks it.
```

---

## Fix-it prompts (push back with specifics, not "it's broken")

```text
Bug: <what I did> → <what happened> (expected <what should happen>).
Error output:
<paste the exact error / log lines>
Fix the cause, don't work around it. Don't touch unrelated files. Add a test that would have caught it.
```

```text
You stored overdue as a column / added it as a status. Remove that: overdue must be computed in the SELECT from due_at and status (see AGENTS.md). Add a NEW migration that drops nothing with data; just stop using the column.
```

```text
`npm run build` fails in Docker with: <paste>. The Docker build has no database: make sure every page/route reading the DB has `export const dynamic = "force-dynamic"` and nothing connects at import time.
```

Ask mode (cheaper, no edits) for questions like "where is X implemented?" or "why does Y happen?".
