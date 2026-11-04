import { Pool, PoolClient, types } from "pg";

// DATE columns are returned as 'YYYY-MM-DD' strings (no timezone shifting).
types.setTypeParser(1082, (v) => v);
// NUMERIC -> number, BIGINT -> number (counts / ids are well below 2^53)
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

export type DbCtx = { userId: string | null; perms: string[] };

const g = globalThis as unknown as { __riiPool?: Pool };

export function getPool(): Pool {
  if (!g.__riiPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    const pool = new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 10), options: "-c TimeZone=Asia/Jakarta" });
    g.__riiPool = pool;
  }
  return g.__riiPool;
}

export async function closePool() {
  if (g.__riiPool) {
    await g.__riiPool.end();
    g.__riiPool = undefined;
  }
}

export type Tx = PoolClient;

/**
 * Runs fn inside a transaction with the request security context applied
 * (used by Row-Level Security policies and DB triggers).
 */
export async function withTx<T>(ctx: DbCtx | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true), set_config('app.perms', $2, true)", [
      ctx?.userId ?? "",
      ctx ? "|" + ctx.perms.join("|") + "|" : "",
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Read helper: single statement in its own context-bound transaction. */
export async function q<T = any>(ctx: DbCtx | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return withTx(ctx, async (tx) => (await tx.query(sql, params)).rows as T[]);
}

export async function q1<T = any>(ctx: DbCtx | null, sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(ctx, sql, params);
  return rows[0] ?? null;
}

export const SYSTEM_CTX: DbCtx = { userId: null, perms: [] };
