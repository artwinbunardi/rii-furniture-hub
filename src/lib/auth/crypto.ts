import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
function secret() {
  const s = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s.length < 32 || s.startsWith("change-me"))) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters in production (openssl rand -hex 32).");
  }
  return s || "dev-secret";
}
export function hashToken(token: string) {
  return crypto.createHmac("sha256", secret()).update(token).digest("hex");
}
export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string | null) {
  if (!hash) return false;
  return bcrypt.compare(pw, hash);
}
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
