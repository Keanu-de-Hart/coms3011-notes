import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPglite, type Db } from "@/lib/db";
import { migrate, migrations } from "@/lib/migrations";

let db: Db;

// A fresh in-memory Postgres per test: deterministic, never touches the dev database.
beforeEach(async () => {
  db = fromPglite(new PGlite());
  await migrate(db);
});

async function count(sql: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(sql);
  return rows[0].n;
}

describe("database", () => {
  it("records every migration once, and re-running is a no-op", async () => {
    expect(await count("SELECT count(*)::int AS n FROM schema_migrations")).toBe(migrations.length);
    await migrate(db);
    expect(await count("SELECT count(*)::int AS n FROM schema_migrations")).toBe(migrations.length);
  });

  it("rolls back every write in a failed transaction", async () => {
    await db.exec("CREATE TABLE t (v integer NOT NULL)");
    await expect(
      db.tx(async (tx) => {
        await tx.query("INSERT INTO t (v) VALUES ($1)", [1]);
        await tx.query("INSERT INTO t (v) VALUES ($1)", [null]);
      }),
    ).rejects.toThrow();
    expect(await count("SELECT count(*)::int AS n FROM t")).toBe(0);
  });
});
