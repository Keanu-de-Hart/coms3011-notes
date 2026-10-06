import type { Db } from "../db";

export type Status = "todo" | "in_progress" | "complete";
export const STATUSES: { value: Status; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In-Progress" },
  { value: "complete", label: "Complete" },
];

export type Task = {
  id: number;
  title: string;
  description: string;
  topic: string;
  status: Status;
  due_at: Date | null;
  archived_at: Date | null;
  overdue: boolean;
};

// Overdue is derived at read time, never stored.
const SELECT = `
  SELECT id, title, description, topic, status, due_at, archived_at,
         (due_at IS NOT NULL AND due_at < now() AND status <> 'complete') AS overdue
  FROM tasks`;

export async function listTasks(db: Db, opts: { archived?: boolean } = {}): Promise<Task[]> {
  const where = opts.archived ? "archived_at IS NOT NULL" : "archived_at IS NULL";
  const { rows } = await db.query<Task>(`${SELECT} WHERE ${where} ORDER BY id`);
  return rows;
}

export async function createTask(
  db: Db,
  input: { title: string; description?: string; topic?: string; dueAt?: string | null },
): Promise<Task> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO tasks (title, description, topic, due_at) VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.title, input.description ?? "", input.topic ?? "", input.dueAt ?? null],
  );
  return getTask(db, rows[0].id);
}

export async function getTask(db: Db, id: number): Promise<Task> {
  const { rows } = await db.query<Task>(`${SELECT} WHERE id = $1`, [id]);
  if (!rows[0]) throw new Error(`Task ${id} not found`);
  return rows[0];
}

export async function archiveTask(db: Db, id: number): Promise<void> {
  await db.query(`UPDATE tasks SET archived_at = now(), updated_at = now() WHERE id = $1`, [id]);
}
