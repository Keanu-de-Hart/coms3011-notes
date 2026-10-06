import type { Db } from "./db";

// APPEND-ONLY. Never edit or remove an entry once it has run; add a new one instead.
// Never DROP a table holding data: an older database must upgrade in place.
export const migrations: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "create tasks",
    sql: `
      CREATE TABLE tasks (
        id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        title       text NOT NULL CHECK (length(trim(title)) > 0),
        description text NOT NULL DEFAULT '',
        topic       text NOT NULL DEFAULT '',
        status      text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'complete')),
        due_at      timestamptz,
        archived_at timestamptz,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX tasks_active_idx ON tasks (archived_at, status, due_at);
    `,
  },
];

export async function migrate(db: Db): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         integer PRIMARY KEY,
      name       text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const { rows } = await db.query<{ id: number }>("SELECT id FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.id));
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    await db.tx(async (t) => {
      await t.exec(m.sql);
      await t.query("INSERT INTO schema_migrations (id, name) VALUES ($1, $2)", [m.id, m.name]);
    });
  }
}
