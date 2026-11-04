import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { PageHeader, Card, CardHeader, Badge, Alert } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { hasPerm } from "@/lib/rbac";
import { fmtDate, fmtDateTime, todayJakarta } from "@/lib/utils";
import { ProductForm } from "../product-form";
import { StockOps, ImageManager } from "./client";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Product" };

export default async function ProductAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser("inventory.view");
  const { t, lang } = await getT();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await q1(user.ctx, `SELECT p.*, c.name_id, c.name_en, sl.code AS loc, w.name AS wh, b.owned, b.in_warehouse, b.checked_out, b.pending_inspection, b.damaged, b.under_repair, b.lost
    FROM products p JOIN categories c ON c.id = p.category_id JOIN inventory_balances b ON b.product_id = p.id
    LEFT JOIN storage_locations sl ON sl.id = p.location_id LEFT JOIN warehouses w ON w.id = sl.warehouse_id WHERE p.id = $1`, [id]);
  if (!p) notFound();
  const today = todayJakarta();
  const avail = await q1(user.ctx, `SELECT * FROM product_availability(ARRAY[$1::uuid], $2::date, $2::date)`, [id, today]);
  const images = await q(user.ctx, `SELECT m.id, m.storage_key, m.alt_text FROM product_images pi JOIN media_assets m ON m.id = pi.media_id WHERE pi.product_id = $1 ORDER BY pi.sort`, [id]);
  const media = hasPerm(user.perms, "product.manage") ? await q(user.ctx, `SELECT id, storage_key, filename FROM media_assets WHERE category IN ('product','general','gallery') ORDER BY created_at DESC LIMIT 60`) : [];
  const movements = await q(user.ctx, `SELECT m.*, u.name AS user_name, a.name AS approver, r.number FROM inventory_movements m LEFT JOIN users u ON u.id = m.performed_by LEFT JOIN users a ON a.id = m.approved_by LEFT JOIN reservations r ON r.id = m.reservation_id WHERE m.product_id = $1 ORDER BY m.created_at DESC, m.id DESC LIMIT 50`, [id]);
  const upcoming = await q(user.ctx, `SELECT r.id, r.number, r.status, h.hold_start, h.hold_end, h.qty, h.is_hard, pr.name AS project FROM reservation_holds h JOIN reservations r ON r.id = h.reservation_id LEFT JOIN projects pr ON pr.id = r.project_id WHERE h.product_id = $1 AND h.hold_end >= $2 ORDER BY h.hold_start`, [id, today]);
  const units = await q(user.ctx, `SELECT u.*, sl.code AS loc FROM asset_units u LEFT JOIN storage_locations sl ON sl.id = u.location_id WHERE u.product_id = $1 ORDER BY asset_code`, [id]);
  const cats = await q(user.ctx, `SELECT id, name_id, name_en, parent_id FROM categories ORDER BY sort, name_id`);
  const locs = await q(user.ctx, `SELECT sl.id, sl.code, w.code AS wh FROM storage_locations sl JOIN warehouses w ON w.id = sl.warehouse_id WHERE sl.is_active ORDER BY w.code, sl.code`);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const qr = await QRCode.toDataURL(`${appUrl}/app/warehouse/scan?code=${encodeURIComponent(p.sku)}`, { margin: 1, width: 220 });
  const unitQrs = await Promise.all(units.slice(0, 24).map(async (u) => ({ ...u, qr: await QRCode.toDataURL(`${appUrl}/app/warehouse/scan?code=${encodeURIComponent(u.asset_code)}`, { margin: 0, width: 90 }) })));
  const buckets: [string, number, string][] = [
    [t("owned"), p.owned, "text-ink"], [t("in_warehouse"), p.in_warehouse, "text-ink"], [t("checked_out"), p.checked_out, "text-teal-700"],
    [t("pending_inspection"), p.pending_inspection, "text-sky-700"], [t("damaged"), p.damaged, "text-red-600"], [t("under_repair"), p.under_repair, "text-amber-600"],
    [t("lost"), p.lost, "text-ink-500"], [t("reserved_today"), avail?.reserved ?? 0, "text-violet-700"], [t("bookable"), avail?.available ?? 0, "text-emerald-700"],
  ];
  const canManage = hasPerm(user.perms, "product.manage");
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/inventory" className="hover:text-ink">{t("nav_inventory")}</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{p.name}{!p.is_active && <Badge>{lang === "en" ? "inactive" : "nonaktif"}</Badge>}{p.is_demo && <Badge tone="gold">demo</Badge>}</span>}
        subtitle={<span className="font-mono">{p.sku} · {lang === "en" ? p.name_en : p.name_id} · {p.wh ? `${p.wh} / ${p.loc}` : "—"}</span>}
        actions={<LinkButton href={`/products/${p.slug}`} variant="outline" target="_blank"><ExternalLink className="h-4 w-4" />{lang === "en" ? "View in catalog" : "Lihat di katalog"}</LinkButton>} />
      {sp.created && <Alert tone="success" className="mb-4">{lang === "en" ? "Product created." : "Produk dibuat."}</Alert>}
      <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-9" data-testid="buckets">
        {buckets.map(([k, v, c]) => <div key={k} className="bg-white p-3"><p className="text-[11px] leading-tight text-ink-400">{k}</p><p className={`mt-1 text-xl font-semibold tabular-nums ${c}`}>{v}</p></div>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <StockOps lang={lang} productId={p.id} sku={p.sku} inWarehouse={p.in_warehouse} perms={{
            receive: hasPerm(user.perms, "inventory.receive"), adjust: hasPerm(user.perms, "inventory.adjust_request"), approve: hasPerm(user.perms, "inventory.adjust_approve"),
            damage: hasPerm(user.perms, "warehouse.damage_report"), relocate: hasPerm(user.perms, "warehouse.relocate") || canManage, units: canManage,
          }} locations={locs.map((l) => ({ id: l.id, label: `${l.wh} / ${l.code}` }))} currentLocation={p.location_id} />
          <Card>
            <CardHeader title={lang === "en" ? "Upcoming reservations (holds)" : "Reservasi mendatang (hold)"} subtitle={lang === "en" ? "Hard holds reduce bookable availability; pending requests are soft holds." : "Hold pasti mengurangi ketersediaan; permintaan menunggu adalah soft hold."} />
            {upcoming.length === 0 ? <p className="p-5 text-sm text-ink-400">{t("no_data")}</p> : (
              <table className="tbl"><thead><tr><th>{t("reservation_number")}</th><th>{t("project")}</th><th>{lang === "en" ? "Hold window" : "Periode hold"}</th><th className="text-right">{t("qty")}</th><th>{t("status")}</th></tr></thead>
                <tbody>{upcoming.map((u, i) => <tr key={i}><td><Link className="link font-mono" href={`/app/reservations/${u.id}`}>{u.number}</Link></td><td className="text-ink-500">{u.project}</td><td>{fmtDate(u.hold_start, lang)} – {fmtDate(u.hold_end, lang)}</td><td className="text-right tabular-nums">{u.qty}{!u.is_hard && <span className="text-xs text-amber-700"> (soft)</span>}</td><td><StatusBadge status={u.status} lang={lang} /></td></tr>)}</tbody></table>
            )}
          </Card>
          <Card>
            <CardHeader title={t("movement_history")} subtitle={lang === "en" ? "Immutable ledger — every quantity change is recorded with before/after state." : "Buku besar tidak dapat diubah — setiap perubahan dicatat dengan kondisi sebelum/sesudah."} action={<LinkButton size="sm" variant="ghost" href={`/app/inventory/movements?product=${p.id}`}>{t("view_all")}</LinkButton>} />
            <div className="overflow-x-auto">
              <table className="tbl"><thead><tr><th>{t("date")}</th><th>Type</th><th className="text-right">{t("qty")}</th><th>{lang === "en" ? "From → To" : "Dari → Ke"}</th><th>{lang === "en" ? "Warehouse before → after" : "Gudang sebelum → sesudah"}</th><th>{lang === "en" ? "User" : "Pengguna"}</th><th>{t("reason")}</th></tr></thead>
                <tbody>{movements.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(m.created_at, lang)}</td>
                    <td><Badge tone="gray">{m.movement_type}</Badge></td>
                    <td className="text-right tabular-nums">{m.quantity}</td>
                    <td className="whitespace-nowrap text-xs">{m.from_bucket} → {m.to_bucket}</td>
                    <td className="text-xs tabular-nums">{m.before_state.in_warehouse} → {m.after_state.in_warehouse} <span className="text-ink-400">(own {m.before_state.owned}→{m.after_state.owned})</span></td>
                    <td className="text-xs">{m.user_name}{m.approver && m.approver !== m.user_name ? <div className="text-ink-400">✓ {m.approver}</div> : null}</td>
                    <td className="max-w-[260px] text-xs text-ink-500">{m.number && <Link href={`/app/reservations/${m.reservation_id}`} className="link font-mono">{m.number}</Link>} {m.reason}</td>
                  </tr>
                ))}</tbody></table>
            </div>
          </Card>
          {canManage && (
            <Card>
              <CardHeader title={lang === "en" ? "Product details" : "Detail produk"} />
              <div className="p-5">
                <ProductForm lang={lang} product={p} categories={cats.map((c) => ({ id: c.id, label: `${c.parent_id ? "— " : ""}${lang === "en" ? c.name_en : c.name_id}` }))} locations={locs.map((l) => ({ id: l.id, label: `${l.wh} / ${l.code}` }))} />
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={lang === "en" ? "Photos" : "Foto"} />
            <ImageManager lang={lang} productId={p.id} images={images.map((m) => ({ id: m.id, url: `/media/${m.storage_key}` }))} library={media.map((m) => ({ id: m.id, url: `/media/${m.storage_key}`, name: m.filename }))} canManage={canManage} />
          </Card>
          <Card>
            <CardHeader title={t("qr_code")} subtitle={lang === "en" ? "Scan to open this SKU's warehouse workflow." : "Pindai untuk membuka alur gudang SKU ini."} action={<PrintButton label={t("print_label")} />} />
            <div className="flex flex-col items-center p-5">
              <img src={qr} alt={`QR ${p.sku}`} className="h-44 w-44" data-testid="sku-qr" />
              <p className="mt-2 font-mono text-sm font-semibold">{p.sku}</p>
              <p className="text-xs text-ink-400">{p.name}</p>
            </div>
          </Card>
          {units.length > 0 && (
            <Card>
              <CardHeader title={lang === "en" ? "Asset units" : "Unit aset"} subtitle={`${units.length} ${t("units")}`} />
              <div className="grid grid-cols-3 gap-3 p-4">
                {unitQrs.map((u) => <div key={u.id} className="rounded-lg border border-line p-2 text-center"><img src={u.qr} alt={u.asset_code} className="mx-auto h-16 w-16" /><p className="mt-1 font-mono text-[10px]">{u.asset_code}</p><p className="text-[10px] text-ink-400">{u.status}</p></div>)}
              </div>
              {units.length > 24 && <p className="px-4 pb-4 text-xs text-ink-400">+{units.length - 24}</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
