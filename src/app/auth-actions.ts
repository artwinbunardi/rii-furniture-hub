"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPool, withTx } from "@/lib/db";
import { audit } from "@/lib/services/audit";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { hashPassword, hashToken, randomToken, verifyPassword, PASSWORD_RULE } from "@/lib/auth/crypto";
import { loadUserById } from "@/lib/auth/user";
import { roleHome } from "@/lib/rbac";
import { run, str, type ActionState } from "@/lib/action";
import { AppError } from "@/lib/errors";
import { LANG_COOKIE } from "@/lib/i18n/server";
import { sendMail } from "@/lib/services/mail";

const attempts = new Map<string, { n: number; t: number }>();
function throttle(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (a && now - a.t < 10 * 60e3) {
    if (a.n >= 8) throw new AppError("Terlalu banyak percobaan. Coba lagi dalam 10 menit. / Too many attempts, try again in 10 minutes.");
    a.n++;
  } else attempts.set(key, { n: 1, t: now });
}

function safeNext(next: string) {
  // only same-site paths: reject protocol-relative ("//x") and backslash tricks ("/\\x")
  return /^\/(?![\/\\])/.test(next) && !/[\r\n]/.test(next) ? next : "";
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "";
  const res = await run(async () => {
    const email = str(fd, "email").toLowerCase();
    const password = str(fd, "password");
    if (!email || !password) throw new AppError("Email dan kata sandi wajib diisi. / Email and password are required.");
    throttle(email);
    const { rows } = await getPool().query(`SELECT id, password_hash, status FROM users WHERE email = $1`, [email]);
    const u = rows[0];
    const ok = u && u.status === "active" && (await verifyPassword(password, u.password_hash));
    if (!ok) throw new AppError("Email atau kata sandi salah. / Incorrect email or password.");
    attempts.delete(email);
    await createSession(u.id, fd.get("remember") === "on");
    const user = await loadUserById(u.id);
    dest = safeNext(str(fd, "next")) || roleHome(user?.roles ?? []);
  });
  if (res?.ok) redirect(dest);
  return res;
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const email = str(fd, "email").toLowerCase();
    if (!email) throw new AppError("Email wajib diisi. / Email is required.");
    throttle("reset:" + email);
    const { rows } = await getPool().query(`SELECT id, name FROM users WHERE email = $1 AND status = 'active'`, [email]);
    if (rows[0]) {
      const token = randomToken();
      await getPool().query(`INSERT INTO auth_tokens(user_id, kind, token_hash, expires_at) VALUES ($1,'reset',$2, now() + interval '1 hour')`, [rows[0].id, hashToken(token)]);
      const link = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
      await sendMail(email, "Atur ulang kata sandi RII Furniture Hub", `Halo ${rows[0].name},\n\nKlik tautan berikut untuk mengatur ulang kata sandi Anda (berlaku 1 jam):\n${link}\n\nAbaikan email ini jika Anda tidak memintanya.`, link);
    }
    return { ok: true, message: "Jika email terdaftar, tautan atur ulang telah dikirim. / If the email is registered, a reset link has been sent." };
  });
}

async function consumeToken(token: string, kind: "reset" | "invite") {
  const { rows } = await getPool().query(
    `UPDATE auth_tokens SET used_at = now() WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now() RETURNING user_id`,
    [hashToken(token), kind],
  );
  if (!rows[0]) throw new AppError("Tautan tidak valid atau sudah kedaluwarsa. / The link is invalid or has expired.");
  return rows[0].user_id as string;
}

function checkPasswords(fd: FormData) {
  const pw = str(fd, "password");
  if (!PASSWORD_RULE.test(pw)) throw new AppError("Kata sandi minimal 8 karakter dan mengandung huruf serta angka. / Password needs 8+ chars with letters and numbers.");
  if (pw !== str(fd, "confirm")) throw new AppError("Konfirmasi kata sandi tidak cocok. / Passwords do not match.");
  return pw;
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const pw = checkPasswords(fd);
    const userId = await consumeToken(str(fd, "token"), "reset");
    await getPool().query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [userId, await hashPassword(pw)]);
    await getPool().query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    await withTx({ userId, perms: [] }, (tx) => audit(tx, userId, "auth.password_reset", "user", userId, "Password reset via email link"));
  });
  if (res?.ok) redirect("/login?reset=1");
  return res;
}

export async function acceptInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "/";
  const res = await run(async () => {
    const pw = checkPasswords(fd);
    const userId = await consumeToken(str(fd, "token"), "invite");
    const name = str(fd, "name");
    const upd = await getPool().query(
      `UPDATE users SET password_hash = $2, status = 'active', name = coalesce(nullif($3,''), name), updated_at = now() WHERE id = $1 AND status = 'invited'`,
      [userId, await hashPassword(pw), name],
    );
    if (!upd.rowCount) throw new AppError("Undangan ini tidak lagi berlaku. / This invitation is no longer valid.");
    await withTx({ userId, perms: [] }, (tx) => audit(tx, userId, "auth.invite_accepted", "user", userId, "Invitation accepted"));
    await createSession(userId, false);
    const u = await loadUserById(userId);
    dest = roleHome(u?.roles ?? []);
  });
  if (res?.ok) redirect(dest);
  return res;
}

export async function setLanguageAction(fd: FormData) {
  const lang = str(fd, "lang") === "en" ? "en" : "id";
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 864e2, sameSite: "lax" });
  const u = await getCurrentUser();
  if (u) await getPool().query(`UPDATE users SET locale = $2 WHERE id = $1`, [u.id, lang]);
  const back = safeNext(str(fd, "back")) || "/";
  redirect(back);
}
