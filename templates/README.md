# Todo

A local-first task manager: Next.js + PostgreSQL, packaged as a two-service Docker Compose stack.

## Running it

**Requirements:** Docker with Compose v2. For development without Docker: Node.js 22 (or 24) and npm.

```bash
git clone <this repo>
cd <repo folder>
bash start.sh            # builds the image, starts app + postgres, waits until healthy
```

Open http://localhost:3000.

- Stop (keeps data): `docker compose down`
- Start again: `docker compose up -d`
- Wipe all data: `docker compose down -v`
- Logs: `docker compose logs -f app`

Without the script: `docker compose up -d --build`.

### Development and tests (no Docker needed)

```bash
npm install
npm run dev              # http://localhost:3000, data in .data/pglite (embedded Postgres)
npm test                 # Vitest; every test runs on a fresh in-memory Postgres
```

## Architecture

- `compose.yml`: two services. `app` is built from `Dockerfile` (Next.js standalone server, non-root) and `db` is the official `postgres:17-alpine` image with a named volume and healthcheck. The app waits for the database to be healthy.
- `src/lib/db.ts`: database access. Uses node-postgres when `DATABASE_URL` is set (Docker), otherwise PGlite (dev/tests).
- `src/lib/migrations.ts`: versioned, append-only schema migrations, applied automatically at startup and recorded in `schema_migrations`.
- `src/lib/repo/*`: all SQL, shared by the UI and the tests.
- `GET /api/health`: 200 when the database is reachable, 503 otherwise.

## Third-party code

| Package | Why |
|---|---|
| next, react, react-dom | Required stack; server components and server actions keep data access on the server |
| tailwindcss | Utility CSS from the Next.js template; no separate stylesheet to maintain |
| pg | The standard PostgreSQL driver for Node; pooled connections that recover after a database restart |
| @electric-sql/pglite | Real Postgres compiled to WASM: the same SQL runs in tests and local dev without a database server |
| vitest | Fast TypeScript test runner with no extra config |

## Database design

**tasks**: one row per task. Never deleted.

| Column | Type | Notes |
|---|---|---|
| id | integer identity | PK |
| title | text | NOT NULL, non-blank |
| description | text | |
| topic | text | |
| status | text | CHECK in (`todo`, `in_progress`, `complete`) |
| due_at | timestamptz | end of the chosen day in the user's timezone |
| archived_at | timestamptz | NULL = active; set = archived (archive is a flag, not a delete) |
| created_at, updated_at | timestamptz | |

Overdue is **not stored**. It is derived at read time: `due_at < now() AND status <> 'complete'`.

**schema_migrations**: id, name, applied_at of each migration that has run.

Relationships: _(none yet; add each new table and its foreign keys here)_

## Features

- Create, edit and archive tasks (title, description, due date, topic); archived tasks remain viewable
- Sort by topic, status and due date
- Overdue flag derived from the due date
