import { withTx } from "../db";
import { AppError, ForbiddenError } from "../errors";
import { hasPerm } from "../rbac";
import { isIsoDate } from "../utils";
import { audit } from "./audit";
import type { Actor } from "./reservations";

export type ProjectInput = {
  code?: string; name: string; client_name?: string; event_name?: string; location?: string;
  start_date?: string; end_date?: string; department?: string; notes?: string; status?: string; pic_user_id?: string;
};

function validate(p: ProjectInput) {
  if (!p.name || p.name.trim().length < 3) throw new AppError("Nama proyek minimal 3 karakter. / Project name needs at least 3 characters.");
  for (const d of [p.start_date, p.end_date]) if (d && !isIsoDate(d)) throw new AppError("Tanggal tidak valid. / Invalid date.");
  if (p.start_date && p.end_date && p.end_date < p.start_date) throw new AppError("Tanggal selesai harus setelah tanggal mulai. / End date must be after start date.");
  if (p.status && !["planning", "active", "completed", "cancelled"].includes(p.status)) throw new AppError("Status tidak valid.");
}

export async function createProject(actor: Actor, p: ProjectInput) {
  if (!hasPerm(actor.perms, "project.create") && !hasPerm(actor.perms, "project.manage")) throw new ForbiddenError();
  validate(p);
  return withTx(actor.ctx, async (tx) => {
    let code = p.code?.trim().toUpperCase();
    if (!code) {
      const y = new Date().getFullYear();
      const n = (await tx.query(`SELECT count(*)::int + 1 AS n FROM projects WHERE code LIKE $1`, [`PRJ-${y}-%`])).rows[0].n;
      code = `PRJ-${y}-${String(n).padStart(3, "0")}`;
      while ((await tx.query(`SELECT 1 FROM projects WHERE code = $1`, [code])).rowCount) code = `PRJ-${y}-${String(Number(code.slice(-3)) + 1).padStart(3, "0")}`;
    }
    const { rows } = await tx.query(
      `INSERT INTO projects(code,name,client_name,event_name,location,start_date,end_date,department,notes,status,pic_user_id,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [code, p.name.trim(), p.client_name || null, p.event_name || null, p.location || null, p.start_date || null, p.end_date || null,
       p.department || null, p.notes || null, p.status || "active", p.pic_user_id || actor.id, actor.id],
    );
    await audit(tx, actor.id, "project.create", "project", rows[0].id, `Created project ${code}`);
    return rows[0];
  });
}

export async function updateProject(actor: Actor, id: string, p: ProjectInput) {
  if (!hasPerm(actor.perms, "project.manage")) throw new ForbiddenError();
  validate(p);
  return withTx(actor.ctx, async (tx) => {
    const before = (await tx.query(`SELECT * FROM projects WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!before) throw new AppError("Proyek tidak ditemukan.");
    const { rows } = await tx.query(
      `UPDATE projects SET name=$2, client_name=$3, event_name=$4, location=$5, start_date=$6, end_date=$7, department=$8, notes=$9, status=$10, pic_user_id=$11
        WHERE id = $1 RETURNING *`,
      [id, p.name.trim(), p.client_name || null, p.event_name || null, p.location || null, p.start_date || null, p.end_date || null,
       p.department || null, p.notes || null, p.status || before.status, p.pic_user_id || before.pic_user_id],
    );
    await audit(tx, actor.id, "project.update", "project", id, `Updated project ${before.code}`, before, rows[0]);
    return rows[0];
  });
}
