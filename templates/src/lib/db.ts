import { mkdirSync } from "node:fs";
import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";
import { migrate } from "./migrations";

export type Row = Record<string, unknown>;

// One small interface over both drivers: node-postgres in Docker/production,
// PGlite (real Postgres compiled to WASM) for local dev and tests.
export interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Multi-statement SQL without parameters (used by migrations). */
  exec(sql: string): Promise<void>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

export function fromPool(pool: Pool): Db {
  return {
    query: async (sql, params) => pool.query(sql, params) as never,
    exec: async (sql) => {
      await pool.query(sql);
    },
    async tx(fn) {
      const client = await pool.connect();
      const inner: Db = {
        query: async (sql, params) => client.query(sql, params) as never,
        exec: async (sql) => {
          await client.query(sql);
        },
        tx: (f) => f(inner),
      };
      try {
        await client.query("BEGIN");
        const result = await fn(inner);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

export function fromPglite(pg: PGlite): Db {
  return {
    query: async (sql, params) => pg.query(sql, params) as never,
    exec: async (sql) => {
      await pg.exec(sql);
    },
    tx: (fn) =>
      pg.transaction(async (t) => {
        const inner: Db = {
          query: async (sql, params) => t.query(sql, params) as never,
          exec: async (sql) => {
            await t.exec(sql);
          },
          tx: (f) => f(inner),
        };
        return fn(inner);
      }),
  };
}

async function init(): Promise<Db> {
  let db: Db;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // Without this listener an idle client dying (e.g. the db container restarting) crashes the process.
    pool.on("error", (err) => console.error("postgres pool error:", err.message));
    db = fromPool(pool);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR ?? ".data/pglite";
    mkdirSync(dir, { recursive: true }); // PGlite does not create parent folders
    db = fromPglite(new PGlite(dir));
  }
  await migrate(db);
  return db;
}

// Cached on globalThis so Next's dev hot-reload doesn't open a second connection/PGlite instance.
const g = globalThis as { __db?: Promise<Db> };

/** Lazily connects and migrates on first use; a failed attempt is retried on the next call. */
export function getDb(): Promise<Db> {
  g.__db ??= init().catch((err) => {
    g.__db = undefined;
    throw err;
  });
  return g.__db;
}
