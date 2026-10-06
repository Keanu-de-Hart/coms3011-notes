## Domain rules (todo app: NEVER violate)
<!-- Worked example of a filled-in "Domain rules" section. Note the shape: each line names the
     invariant, the exact column/SQL that implements it, and what the agent must never do. -->
- Statuses are exactly `todo | in_progress | complete` (labels Todo / In-Progress / Complete), enforced by a CHECK constraint. Never add a status.
- Overdue is DERIVED at read time in SQL: `due_at IS NOT NULL AND due_at < now() AND status <> 'complete'`. Never a column, never a status, never an option in a status selector.
- Archive, never delete: `archived_at timestamptz NULL`. No `DELETE FROM tasks` anywhere in the codebase. Archived tasks leave the active list and stay viewable (with Unarchive) at `/archive`.
- `due_at` is `timestamptz`. The form uses `<input type="date">`; a client component converts the chosen day to the END of that day in the browser's timezone (`new Date(y, m-1, d, 23, 59, 59, 999).toISOString()`) and submits it in a hidden field. So overdue flips at the user's midnight, not the server's.
- Everything survives a restart because it is in Postgres.
