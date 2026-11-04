"use server";
import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/session";
import { getPool, withTx } from "@/lib/db";
import { run, str, type ActionState } from "@/lib/action";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword, PASSWORD_RULE } from "@/lib/auth/crypto";
import { audit } from "@/lib/services/audit";

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize();
    const name = str(fd, "name");
    if (name.length < 2) throw new AppError("Nama terlalu pendek. / Name is too short.");
    await getPool().query(`UPDATE users SET name = $2, phone = nullif($3,''), department = nullif($4,''), updated_at = now() WHERE id = $1`, [u.id, name, str(fd, "phone"), str(fd, "department")]);
    revalidatePath("/", "layout");
    return { ok: true, message: "Profil disimpan. / Profile saved." };
  });
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize();
    const { rows } = await getPool().query(`SELECT password_hash FROM users WHERE id = $1`, [u.id]);
    if (!(await verifyPassword(str(fd, "current"), rows[0]?.password_hash))) throw new AppError("Kata sandi saat ini salah. / Current password is incorrect.");
    const pw = str(fd, "password");
    if (!PASSWORD_RULE.test(pw)) throw new AppError("Kata sandi minimal 8 karakter dan mengandung huruf serta angka. / Password needs 8+ chars with letters and numbers.");
    if (pw !== str(fd, "confirm")) throw new AppError("Konfirmasi kata sandi tidak cocok. / Passwords do not match.");
    await getPool().query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [u.id, await hashPassword(pw)]);
    await withTx(u.ctx, (tx) => audit(tx, u.id, "auth.password_change", "user", u.id, "Password changed"));
    return { ok: true, message: "Kata sandi diperbarui. / Password updated." };
  });
}
