import { getPool } from "../db";

/**
 * Outgoing email. Every message is recorded in email_outbox (visible to admins under
 * Settings → Email Outbox). Real SMTP delivery is NOT configured in this environment;
 * plug a provider in here (e.g. nodemailer with SMTP_URL) for production.
 */
export async function sendMail(to: string, subject: string, body: string, link?: string) {
  await getPool().query(`INSERT INTO email_outbox(to_email, subject, body, link, sent) VALUES ($1,$2,$3,$4,false)`, [to, subject, body, link ?? null]);
  if (process.env.NODE_ENV !== "production") console.log(`[mail] to=${to} subject="${subject}" link=${link ?? "-"}`);
}
