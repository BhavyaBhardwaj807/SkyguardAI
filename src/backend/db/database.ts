import pg from "pg";
import { readFile } from "node:fs/promises";
export interface Queryable {
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: any[]; rowCount?: number | null }>;
}
export interface Database extends Queryable {
  transaction<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export function postgres(url: string): Database {
  const pool = new pg.Pool({
    connectionString: url,
    max: 8,
    connectionTimeoutMillis: 5000,
  });
  return {
    query: (s, v) => pool.query(s, v),
    close: () => pool.end(),
    async transaction(fn) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const r = await fn(c);
        await c.query("COMMIT");
        return r;
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    },
  };
}
export async function migrate(db: Database, root: string) {
  await db.transaction(async (q) => {
    await q.query(
      await readFile(`${root}/src/backend/db/schema.sql`, "utf8"),
    );
  });
}
