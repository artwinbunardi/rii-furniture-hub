import type { Tx } from "../db";

export async function audit(
  tx: Tx,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
  before?: unknown,
  after?: unknown,
) {
  await tx.query(
    `INSERT INTO audit_logs(user_id, action, entity_type, entity_id, summary, before_data, after_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, action, entityType, entityId, summary, before === undefined ? null : JSON.stringify(before), after === undefined ? null : JSON.stringify(after)],
  );
}
