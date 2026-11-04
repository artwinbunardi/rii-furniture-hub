import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPool, type DbCtx, withTx } from "../db";
import { hashToken, randomToken } from "./crypto";
import { hasPerm } from "../rbac";
import { loadUserById, type CurrentUser } from "./user";
export type { CurrentUser };
import { ForbiddenError } from "../errors";

export const SESSION_COOKIE = "rii_session";
const SHORT_HOURS = 12;
const LONG_DAYS = 30;


export async function createSession(userId: string, remember: boolean) {
  const token = randomToken();
  const expires = new Date(Date.now() + (remember ? LONG_DAYS * 864e5 : SHORT_HOURS * 36e5));
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await getPool().query(
    `INSERT INTO sessions(token_hash, user_id, remember, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)`,
    [hashToken(token), userId, remember, ua, expires],
  );
  await getPool().query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]).catch(() => {});
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https"),
    path: "/",
    ...(remember ? { expires } : {}),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getPool().query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await getPool().query(
    `UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1 AND expires_at > now() RETURNING user_id`,
    [hashToken(token)],
  );
  if (!rows[0]) return null;
  return loadUserById(rows[0].user_id);
});

/** For pages: redirect to login when signed out, to /forbidden when lacking permission. */
export async function requireUser(perm?: string | string[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const h = await headers();
    const path = h.get("x-pathname") || "/";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  if (perm) {
    const list = Array.isArray(perm) ? perm : [perm];
    if (!list.some((p) => hasPerm(user.perms, p))) redirect("/forbidden");
  }
  return user;
}

/** For server actions / API: throws ForbiddenError instead of redirecting. */
export async function authorize(perm?: string | string[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("Sesi berakhir, silakan login kembali. / Please sign in again.");
  if (perm) {
    const list = Array.isArray(perm) ? perm : [perm];
    if (!list.some((p) => hasPerm(user.perms, p))) throw new ForbiddenError();
  }
  return user;
}

export function can(user: CurrentUser | null, perm: string) {
  return !!user && hasPerm(user.perms, perm);
}

export { withTx };
