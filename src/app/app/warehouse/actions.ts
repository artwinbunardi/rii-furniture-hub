"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/session";
import { q1 } from "@/lib/db";
import { run, str, int, type ActionState } from "@/lib/action";
import * as wh from "@/lib/services/warehouse";

export async function damageOpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("inventory.repair");
    await wh.damageAction(u, str(fd, "id"), str(fd, "op") as any, int(fd, "qty"), str(fd, "note"));
    revalidatePath("/app/warehouse/damaged");
    return { ok: true, message: "Tersimpan. / Saved." };
  });
}

export async function adjustmentDecisionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("inventory.adjust_approve");
    await wh.decideAdjustment(u, str(fd, "id"), str(fd, "decision") === "approve", str(fd, "reason") || str(fd, "note"));
    revalidatePath("/app/warehouse/adjustments");
    return { ok: true, message: "Keputusan disimpan. / Decision saved." };
  });
}

export async function resolveDiscrepancyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("inventory.adjust_approve");
    await wh.resolveDiscrepancy(u, str(fd, "id"), str(fd, "resolution"));
    revalidatePath("/app/warehouse/discrepancies");
    return { ok: true, message: "Selisih diselesaikan. / Resolved." };
  });
}

/** Resolves a scanned/typed code (SKU, asset code, reservation number) to its workflow page. */
export async function resolveCodeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const code = str(fd, "code").trim();
  let dest = "";
  const r = await run(async () => {
    const u = await authorize("inventory.view");
    const raw = code.replace(/^.*[?&]code=/, "");
    const c = decodeURIComponent(raw).toUpperCase();
    if (!c) return { ok: false, error: "Kode kosong. / Empty code." };
    const p = await q1(u.ctx, `SELECT id FROM products WHERE upper(sku) = $1`, [c]);
    if (p) { dest = `/app/inventory/${p.id}`; return; }
    const unit = await q1(u.ctx, `SELECT product_id FROM asset_units WHERE upper(asset_code) = $1`, [c]);
    if (unit) { dest = `/app/inventory/${unit.product_id}?unit=${encodeURIComponent(c)}`; return; }
    const res = await q1(u.ctx, `SELECT id FROM reservations WHERE upper(number) = $1`, [c]);
    if (res) { dest = `/app/reservations/${res.id}`; return; }
    return { ok: false, error: `Kode "${c}" tidak ditemukan. / Code not found.` };
  });
  if (dest) redirect(dest);
  return r;
}
