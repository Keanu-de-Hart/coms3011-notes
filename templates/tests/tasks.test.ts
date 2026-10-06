import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPglite, type Db } from "@/lib/db";
import { migrate } from "@/lib/migrations";
import { archiveTask, createTask, getTask, listTasks } from "@/lib/repo/tasks";

let db: Db;

// A fresh in-memory Postgres per test: deterministic, never touches the dev database.
beforeEach(async () => {
  db = fromPglite(new PGlite());
  await migrate(db);
});

describe("tasks", () => {
  it("archiving hides a task from the active list but keeps the row", async () => {
    const t = await createTask(db, { title: "Write report" });
    await archiveTask(db, t.id);
    expect(await listTasks(db)).toHaveLength(0);
    expect((await listTasks(db, { archived: true })).map((x) => x.id)).toEqual([t.id]);
  });

  it("derives overdue from due date and status", async () => {
    const past = await createTask(db, { title: "Late", dueAt: "2020-01-01T00:00:00Z" });
    const future = await createTask(db, { title: "Later", dueAt: "2999-01-01T00:00:00Z" });
    expect(past.overdue).toBe(true);
    expect(future.overdue).toBe(false);
    await db.query("UPDATE tasks SET status = 'complete' WHERE id = $1", [past.id]);
    expect((await getTask(db, past.id)).overdue).toBe(false);
  });

  it("rejects a status outside the three fixed ones", async () => {
    const t = await createTask(db, { title: "X" });
    await expect(db.query("UPDATE tasks SET status = 'overdue' WHERE id = $1", [t.id])).rejects.toThrow();
  });

  it("re-running migrations is a no-op", async () => {
    await createTask(db, { title: "Keep me" });
    await migrate(db);
    expect(await listTasks(db)).toHaveLength(1);
  });
});
