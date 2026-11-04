"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/session";
import { withTx } from "@/lib/db";
import { run, type ActionState } from "@/lib/action";
import { AppError } from "@/lib/errors";
import { hasPerm } from "@/lib/rbac";
import { isIsoDate, slugify, todayJakarta } from "@/lib/utils";
import * as res from "@/lib/services/reservations";

import { DATES_COOKIE } from "@/lib/site/loader";

export async function addToCartAction(productId: string, qty: number): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("reservation.create");
    await res.addToCart(u, productId, qty);
    revalidatePath("/", "layout");
  });
}

export async function toggleFavoriteAction(productId: string): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("favorites.manage");
    await withTx(u.ctx, async (tx) => {
      const del = await tx.query(`DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`, [u.id, productId]);
      if (del.rowCount === 0) await tx.query(`INSERT INTO favorites(user_id, product_id) VALUES ($1,$2)`, [u.id, productId]);
    });
  });
}

export async function setDatesAction(from: string, to: string): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("catalog.view");
    if (!isIsoDate(from) || !isIsoDate(to)) throw new AppError("Tanggal tidak valid. / Invalid dates.");
    if (to < from) throw new AppError("Tanggal kembali harus setelah tanggal loading. / Return date must be on/after loading date.");
    if (from < todayJakarta()) throw new AppError("Tanggal loading tidak boleh di masa lalu. / Loading date cannot be in the past.");
    (await cookies()).set(DATES_COOKIE, `${from}|${to}`, { path: "/", sameSite: "lax", maxAge: 30 * 864e2 });
    if (hasPerm(u.perms, "reservation.create")) {
      const cart = await withTx(u.ctx, (tx) => res.getOrCreateCart(tx, u));
      await res.updateDraft(u, cart.id, {
        project_id: cart.project_id, loading_date: from, return_date: to, event_location: cart.event_location,
        department: cart.department, special_instructions: cart.special_instructions,
      });
    }
    revalidatePath("/", "layout");
  });
}

export async function addToWishlistAction(productId: string, wishlistId: string | null, newName?: string): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("favorites.manage");
    await withTx(u.ctx, async (tx) => {
      let id = wishlistId;
      if (!id) {
        const name = (newName ?? "").trim();
        if (!name) throw new AppError("Nama wishlist wajib diisi. / Wishlist name is required.");
        const slug = slugify(name) || "wishlist";
        const r = await tx.query(
          `INSERT INTO collections(slug, name, kind, owner_id, is_published) VALUES ($1,$2,'wishlist',$3,false)
           ON CONFLICT (owner_id, slug) WHERE kind = 'wishlist' DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [slug, name, u.id],
        );
        id = r.rows[0].id;
      } else {
        const own = await tx.query(`SELECT 1 FROM collections WHERE id = $1 AND owner_id = $2 AND kind = 'wishlist'`, [id, u.id]);
        if (!own.rowCount) throw new AppError("Wishlist tidak ditemukan. / Wishlist not found.");
      }
      await tx.query(`INSERT INTO collection_products(collection_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, productId]);
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Ditambahkan ke wishlist. / Added to wishlist." };
  });
}

export async function removeFromWishlistAction(wishlistId: string, productId: string): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("favorites.manage");
    await withTx(u.ctx, (tx) => tx.query(
      `DELETE FROM collection_products cp USING collections c WHERE cp.collection_id = c.id AND c.id = $1 AND c.owner_id = $2 AND cp.product_id = $3`,
      [wishlistId, u.id, productId],
    ));
    revalidatePath("/", "layout");
  });
}

export async function deleteWishlistAction(wishlistId: string): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("favorites.manage");
    await withTx(u.ctx, (tx) => tx.query(`DELETE FROM collections WHERE id = $1 AND owner_id = $2 AND kind = 'wishlist'`, [wishlistId, u.id]));
    revalidatePath("/", "layout");
  });
}

const contactHits = new Map<string, number[]>();
export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    // public endpoint: throttle per client (5 messages / 10 minutes) to stop outbox flooding
    const { headers } = await import("next/headers");
    const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
    const now = Date.now(), recent = (contactHits.get(ip) ?? []).filter((t) => now - t < 600_000);
    if (recent.length >= 5) throw new AppError("Terlalu banyak pesan. Coba lagi nanti. / Too many messages, try again later.");
    contactHits.set(ip, [...recent, now]);
    if (String(fd.get("website") ?? "")) return { ok: true }; // honeypot field filled → bot
    const name = String(fd.get("name") ?? "").trim().slice(0, 120);
    const email = String(fd.get("email") ?? "").trim().slice(0, 200);
    const message = String(fd.get("message") ?? "").trim().slice(0, 4000);
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 5) throw new AppError("Lengkapi nama, email yang valid dan pesan. / Please fill in name, a valid email and a message.");
    const { sendMail } = await import("@/lib/services/mail");
    const { getPool } = await import("@/lib/db");
    const admins = (await getPool().query(`SELECT u.email::text FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role_code = 'admin' AND u.status = 'active'`)).rows;
    for (const a of admins) await sendMail(a.email, `[Website] Pesan dari ${name}`, `Dari: ${name} <${email}>\n\n${message}`);
  });
}
