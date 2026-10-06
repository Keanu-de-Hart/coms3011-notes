<!-- Paste everything below this line at the END of the AGENTS.md that create-next-app generates
     (below its END:nextjs-agent-rules marker). Qoder reads AGENTS.md on every request.
     If the brief is not the todo app: rewrite only the "Domain rules" section from the brief. -->

# Project rules: follow on every task

## Stack (fixed: never add a second library for a job already covered)
- Next.js App Router + TypeScript + Tailwind, `src/` dir, `@/*` import alias (already scaffolded).
- PostgreSQL through `pg` (node-postgres). No ORM, no query builder.
- Local dev and tests run on PGlite (`@electric-sql/pglite`, real Postgres in-process). Docker runs the real `postgres:17-alpine`. Same SQL for both.
- Tests: Vitest. `npm test` = `vitest run`. Test files live in `tests/*.test.ts`.
- Do not install packages unless the task names them. Check package.json first.

## Data layer (exists: extend it, never replace it)
- `src/lib/db.ts`: `getDb()` returns `Db { query(sql, params), exec(sql), tx(fn) }`. Never connect at import time.
- `src/lib/migrations.ts` is APPEND-ONLY: every schema change is a NEW entry with the next id. Never edit an old entry. Never DROP a table/column holding data.
- All SQL lives in `src/lib/repo/<area>.ts` as functions taking `db: Db` first. Pages, server actions, API routes and tests all call these. One implementation of every rule.
- Parameterised SQL only ($1, $2...). Cast COUNT/SUM to `::int`.
- No N+1 queries: load related rows (tags, blockers...) for a whole list in one JOIN / `json_agg` / `= ANY($1)` query.
- Index every column that list queries filter or sort by.
- A write touching more than one table goes inside `db.tx(...)`.

## Next.js rules
- Every page or route that reads the database starts with `export const dynamic = "force-dynamic";` (the Docker build has no database).
- Mutations: server actions that call repo functions, then `revalidatePath`.
- No localStorage/sessionStorage for app data or settings. Everything persists in Postgres.
- Never delete `public/` (the Dockerfile copies it).
- Dates: render them in a client component using the browser's timezone (`suppressHydrationWarning`).

## Domain rules (todo app: NEVER violate)
- Statuses are exactly `todo | in_progress | complete` (labels Todo / In-Progress / Complete), enforced by a CHECK constraint. Never add a status.
- Overdue is DERIVED at read time in SQL: `due_at IS NOT NULL AND due_at < now() AND status <> 'complete'`. Never a column, never a status, never an option in a status selector.
- Archive, never delete: `archived_at timestamptz NULL`. No `DELETE FROM tasks` anywhere in the codebase. Archived tasks leave the active list and stay viewable (with Unarchive) at `/archive`.
- `due_at` is `timestamptz`. The form uses `<input type="date">`; a client component converts the chosen day to the END of that day in the browser's timezone (`new Date(y, m-1, d, 23, 59, 59, 999).toISOString()`) and submits it in a hidden field. So overdue flips at the user's midnight, not the server's.
- Everything survives a restart because it is in Postgres.

## Docker (working: do not change unless asked)
- compose.yml has EXACTLY two services: `app` (`build: .`) and `db` (`postgres:17-alpine`, named volume, healthcheck). App gets `DATABASE_URL` + `NODE_ENV=production` and waits for db to be healthy.
- `GET /api/health` returns 200 `{status:"ok"}`, or 503 when the database is unreachable.
- `next.config.ts` keeps `output: "standalone"` and `serverExternalPackages: ["@electric-sql/pglite"]`.

## How to work
- Do only the task asked. Don't refactor, restyle or rename unrelated code, routes or files.
- Every feature adds at least 2 behaviour tests in `tests/`: a fresh `new PGlite()` + `migrate()` per test, real SQL, no mocks, never the `.data` database. No render-only tests.
- Before finishing: run `npm test` and `npm run build`, and fix any failure.
- Keep README.md current: add to the Features list, and update Database design when you add a table or column.
- Do not run git. Do not start the dev server or Docker.
- Final message: the files changed, then at most 5 steps to verify in the browser. Keep it short.
