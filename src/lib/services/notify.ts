import { getPool, q1, type DbCtx } from "../db";
import { sendMail } from "./mail";

type Event = "submitted" | "approved" | "rejected" | "cancelled" | "dispatched";

/**
 * Reservation e-mail notifications (written to the outbox). Called by server actions after the
 * state change has committed; failures are logged and never undo the business action.
 */
export async function notifyReservation(ctx: DbCtx, reservationId: string, event: Event) {
  try {
    const pool = getPool();
    // read through the actor's RLS context (reservations are row-level protected)
    const r = await q1(ctx, `SELECT r.number, r.loading_date::text, r.return_date::text, r.rejection_reason, r.approval_note, p.name AS project,
        u.email::text AS req_email, u.name AS req_name
      FROM reservations r LEFT JOIN projects p ON p.id = r.project_id JOIN users u ON u.id = r.requester_id WHERE r.id = $1`, [reservationId]);
    if (!r) { console.error(`[notify] reservation ${reservationId} not visible to actor`); return; }
    const base = process.env.APP_URL ?? "http://localhost:3000";
    const when = `${r.loading_date} → ${r.return_date}`;
    if (event === "submitted") {
      const approvers = (await pool.query(`SELECT DISTINCT u.email::text, u.name FROM users u JOIN user_roles ur ON ur.user_id = u.id
        JOIN role_permissions rp ON rp.role_code = ur.role_code WHERE u.status = 'active' AND rp.permission_code = 'reservation.approve'`)).rows;
      const link = `${base}/app/reservations/${reservationId}`;
      for (const a of approvers) await sendMail(a.email, `[RII] Reservasi baru menunggu persetujuan: ${r.number}`, `Halo ${a.name},\n\n${r.req_name} mengajukan reservasi ${r.number} untuk proyek "${r.project}" (${when}).\nSilakan tinjau dan setujui atau tolak.\n${link}`, link);
      return;
    }
    const link = `${base}/my-reservations/${reservationId}`;
    const text: Record<Exclude<Event, "submitted">, [string, string]> = {
      approved: [`Reservasi ${r.number} disetujui`, `Reservasi Anda untuk "${r.project}" (${when}) telah disetujui.${r.approval_note ? `\nCatatan: ${r.approval_note}` : ""}`],
      rejected: [`Reservasi ${r.number} ditolak`, `Reservasi Anda untuk "${r.project}" ditolak.\nAlasan: ${r.rejection_reason ?? "-"}`],
      cancelled: [`Reservasi ${r.number} dibatalkan`, `Reservasi untuk "${r.project}" (${when}) telah dibatalkan.`],
      dispatched: [`Reservasi ${r.number} telah dikirim`, `Barang untuk "${r.project}" telah keluar dari gudang. Mohon dikembalikan paling lambat ${r.return_date}.`],
    };
    const [subject, body] = text[event];
    await sendMail(r.req_email, `[RII] ${subject}`, `Halo ${r.req_name},\n\n${body}\n\n${link}`, link);
  } catch (e) {
    console.error("[notify] failed", e);
  }
}
