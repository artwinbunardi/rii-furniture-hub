"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/session";
import { withTx } from "@/lib/db";
import { run, str, int, num, type ActionState } from "@/lib/action";
import * as products from "@/lib/services/products";
import * as wh from "@/lib/services/warehouse";
import { saveUpload } from "@/lib/services/media";
import { audit } from "@/lib/services/audit";
import { AppError } from "@/lib/errors";

function productInput(fd: FormData): products.ProductInput {
  return {
    sku: str(fd, "sku").toUpperCase(), name: str(fd, "name"), category_id: str(fd, "category_id"), description: str(fd, "description"),
    length_cm: num(fd, "length_cm"), width_cm: num(fd, "width_cm"), height_cm: num(fd, "height_cm"), weight_kg: num(fd, "weight_kg"),
    color: str(fd, "color"), material: str(fd, "material"), condition_grade: str(fd, "condition_grade") || "good",
    location_id: str(fd, "location_id") || null, min_stock: int(fd, "min_stock"), turnaround_days: str(fd, "turnaround_days") ? int(fd, "turnaround_days") : null,
    track_units: fd.get("track_units") === "on", is_active: fd.get("is_active_present") ? fd.get("is_active") === "on" : true,
  };
}

export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = "";
  const r = await run(async () => {
    const u = await authorize("product.manage");
    const id = str(fd, "id");
    if (id) {
      await products.updateProduct(u, id, productInput(fd));
      revalidatePath(`/app/inventory/${id}`);
      return { ok: true, message: "Produk disimpan. / Product saved." };
    }
    const p = await products.createProduct(u, productInput(fd), int(fd, "initial_qty"));
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length) {
      const ids = await withTx(u.ctx, async (tx) => { const out: string[] = []; for (const f of files) out.push((await saveUpload(tx, u, f, "product", p.name)).id); return out; });
      await products.addProductImages(u, p.id, ids);
    }
    newId = p.id;
  });
  if (newId) redirect(`/app/inventory/${newId}?created=1`);
  return r;
}

export async function uploadProductImagesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("product.manage");
    const pid = str(fd, "product_id");
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    const existing = fd.getAll("media_ids").map(String).filter(Boolean);
    if (!files.length && !existing.length) throw new AppError("Pilih gambar terlebih dahulu. / Choose images first.");
    const ids = await withTx(u.ctx, async (tx) => { const out: string[] = []; for (const f of files) out.push((await saveUpload(tx, u, f, "product")).id); return out; });
    await products.addProductImages(u, pid, [...ids, ...existing]);
    revalidatePath(`/app/inventory/${pid}`);
    return { ok: true, message: "Gambar ditambahkan. / Images added." };
  });
}

export async function imageOpAction(fd: FormData) {
  const u = await authorize("product.manage");
  const pid = str(fd, "product_id"), mid = str(fd, "media_id"), op = str(fd, "op");
  if (op === "remove") await products.removeProductImage(u, pid, mid);
  else await products.moveProductImage(u, pid, mid, op === "up" ? -1 : 1);
  revalidatePath(`/app/inventory/${pid}`);
}

export async function stockOpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const pid = str(fd, "product_id");
    const op = str(fd, "op");
    const qty = int(fd, "qty");
    const reason = str(fd, "reason");
    if (op === "receive") {
      await wh.receiveStock(await authorize("inventory.receive"), pid, qty, reason);
    } else if (op === "adjust") {
      const u = await authorize("inventory.adjust_request");
      const id = await wh.requestAdjustment(u, pid, str(fd, "kind"), qty, reason);
      if (fd.get("apply_now") === "on") await wh.decideAdjustment(await authorize("inventory.adjust_approve"), id, true, "Langsung disetujui oleh manajer / Approved directly by manager");
    } else if (op === "damage") {
      await wh.reportDamage(await authorize("warehouse.damage_report"), pid, qty, str(fd, "severity") || "minor", reason);
    } else if (op === "relocate") {
      await products.relocateProduct(await authorize(["warehouse.relocate", "product.manage"]), pid, str(fd, "location_id") || null, reason);
    } else if (op === "count") {
      await wh.reportCountMismatch(await authorize("inventory.adjust_request"), pid, int(fd, "expected"), int(fd, "actual"), reason);
    } else if (op === "units") {
      const u = await authorize("product.manage");
      const n = int(fd, "count");
      if (!Number.isInteger(n) || n < 1 || n > 500) throw new AppError("Jumlah unit 1–500.");
      await withTx(u.ctx, async (tx) => {
        const p = (await tx.query(`SELECT sku, location_id FROM products WHERE id = $1`, [pid])).rows[0];
        const start = (await tx.query(`SELECT count(*)::int AS n FROM asset_units WHERE product_id = $1`, [pid])).rows[0].n;
        for (let i = 1; i <= n; i++) await tx.query(`INSERT INTO asset_units(product_id, asset_code, location_id) VALUES ($1,$2,$3)`, [pid, `${p.sku}-U${String(start + i).padStart(3, "0")}`, p.location_id]);
        await tx.query(`UPDATE products SET track_units = true WHERE id = $1`, [pid]);
        await audit(tx, u.id, "asset_units.generate", "product", pid, `Generated ${n} asset codes`);
      });
    } else throw new AppError("Unknown operation");
    revalidatePath(`/app/inventory/${pid}`);
    revalidatePath("/app/inventory");
    return { ok: true, message: "Tersimpan. / Saved." };
  });
}
