import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { getReservationView } from "@/lib/services/reservation-queries";
import { PageHeader, Card, CardHeader, Badge, Alert } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/ui/button";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { hasPerm } from "@/lib/rbac";
import { ReservationOps } from "./ops";

export const metadata = { title: "Reservation" };

export default async function ReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["reservation.view_all"]);
  const { t, lang } = await getT();
  if (!/^[0-9a-f-]{36}$/i.test(id) && !id.startsWith("RES-")) notFound();
  const r = await getReservationView(user.ctx, id);
  if (!r) notFound();
  const perms = {
    approve: hasPerm(user.perms, "reservation.approve") && r.requester_id !== user.id || hasPerm(user.perms, "*"),
    cancelAny: hasPerm(user.perms, "reservation.cancel_any"),
    pick: hasPerm(user.perms, "warehouse.pick"),
    checkout: hasPerm(user.perms, "warehouse.checkout"),
    checkin: hasPerm(user.perms, "warehouse.checkin"),
    inspect: hasPerm(user.perms, "warehouse.inspect"),
  };
  const showApproved = !["pending_approval", "rejected", "cancelled", "draft"].includes(r.status);
  const conflicts = r.items.filter((it: any) => {
    const a = r.availability[it.product_id];
    if (!a) return false;
    const need = r.status === "pending_approval" ? it.qty_requested : ["approved", "preparing", "ready_for_dispatch"].includes(r.status) ? it.qty_approved : 0;
    return need > a.available;
  });
  const overdue = ["checked_out", "partially_returned"].includes(r.status) && r.return_date < new Date().toISOString().slice(0, 10);
  const info: [string, React.ReactNode][] = [
    [t("project"), r.project_name ? <Link className="link" href={`/app/projects/${r.project_id}`}>{r.project_code} — {r.project_name}</Link> : "—"],
    [t("client_event"), [r.client_name, r.event_name].filter(Boolean).join(" · ") || "—"],
    [t("requester"), `${r.requester_name} (${r.requester_email})`],
    [t("department"), r.department ?? "—"],
    [t("event_location"), r.event_location ?? r.project_location ?? "—"],
    [t("loading_date"), fmtDate(r.loading_date, lang)],
    [t("return_date"), <span key="rd" className={overdue ? "font-medium text-red-600" : ""}>{fmtDate(r.return_date, lang)}{overdue ? (lang === "en" ? " · overdue" : " · terlambat") : ""}</span>],
    [lang === "en" ? "Submitted" : "Diajukan", fmtDateTime(r.submitted_at, lang)],
  ];
  return (
    <>
      <PageHeader
        breadcrumb={<Link href="/app/reservations" className="hover:text-ink">{t("nav_reservations")}</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="font-mono">{r.number ?? t("st_draft")}</span><StatusBadge status={r.status} lang={lang} /></span>}
        subtitle={r.project_name}
        actions={<LinkButton href={`/app/reservations/${r.id}/picking-list`} variant="outline" target="_blank"><Printer className="h-4 w-4" />{lang === "en" ? "Picking list" : "Daftar picking"}</LinkButton>}
      />
      {conflicts.length > 0 && (
        <Alert tone="warn" className="mb-4 flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{lang === "en" ? "Availability conflict for: " : "Konflik ketersediaan untuk: "}{conflicts.map((c: any) => `${c.sku} (${r.availability[c.product_id].available} ${t("available").toLowerCase()})`).join(", ")}</span>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("items")} subtitle={`${r.items.length} SKU · ${r.items.reduce((a: number, i: any) => a + i.qty_requested, 0)} ${t("units")}`} />
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr>
                  <th>{t("nav_products")}</th><th className="text-right">{t("requested")}</th>
                  <th className="text-right">{t("available_for_dates")}</th>
                  {showApproved && <><th className="text-right">{t("approved_qty")}</th><th className="text-right">{t("picked")}</th><th className="text-right">{t("checked_out_qty")}</th><th className="text-right">{t("returned_qty")}</th></>}
                  <th>{t("storage_location")}</th>
                </tr></thead>
                <tbody>
                  {r.items.map((it: any) => {
                    const a = r.availability[it.product_id];
                    return (
                      <tr key={it.id}>
                        <td><div className="flex items-center gap-3"><img src={it.image ?? ""} alt="" className="h-10 w-12 rounded-md object-cover" /><div><Link href={`/app/inventory/${it.product_id}`} className="link">{it.name}</Link><div className="font-mono text-xs text-ink-400">{it.sku}</div></div></div></td>
                        <td className="text-right tabular-nums">{it.qty_requested}</td>
                        <td className="text-right tabular-nums">{a ? <span className={a.available < it.qty_requested && r.status === "pending_approval" ? "font-semibold text-red-600" : ""}>{a.available}<span className="text-ink-400"> / {a.usable}</span></span> : "—"}{a?.pending ? <div className="text-[11px] text-amber-700">+{a.pending} pending</div> : null}</td>
                        {showApproved && <>
                          <td className="text-right tabular-nums">{it.qty_approved}</td>
                          <td className="text-right tabular-nums">{it.qty_picked}</td>
                          <td className="text-right tabular-nums">{it.qty_checked_out}</td>
                          <td className="text-right tabular-nums">{it.qty_returned}{it.qty_missing ? <span className="text-red-600"> (−{it.qty_missing})</span> : null}</td>
                        </>}
                        <td className="text-ink-500">{it.location_code ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <ReservationOps r={JSON.parse(JSON.stringify(r))} perms={perms} lang={lang} userId={user.id} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={lang === "en" ? "Details" : "Detail"} />
            <dl className="space-y-3 p-5 text-sm">
              {info.map(([k, v]) => <div key={k}><dt className="text-xs text-ink-400">{k}</dt><dd className="mt-0.5">{v}</dd></div>)}
              {r.special_instructions && <div><dt className="text-xs text-ink-400">{t("special_instructions")}</dt><dd className="mt-0.5 whitespace-pre-line rounded-lg bg-canvas p-2.5">{r.special_instructions}</dd></div>}
              {r.approver_name && <div><dt className="text-xs text-ink-400">{t("approval_info")}</dt><dd className="mt-0.5">{r.approver_name} · {fmtDateTime(r.approved_at, lang)}{r.approval_note && <div className="text-ink-500">“{r.approval_note}”</div>}</dd></div>}
              {r.rejection_reason && <div><dt className="text-xs text-ink-400">{t("reason")}</dt><dd className="mt-0.5 text-red-700">{r.rejection_reason}</dd></div>}
            </dl>
          </Card>
          <Card>
            <CardHeader title={t("history")} />
            <ol className="space-y-4 p-5">
              {r.history.map((h: any) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-300" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><Badge tone="gray">{t(`st_${h.to_status}`)}</Badge></div>
                    <p className="mt-1 text-xs text-ink-400">{fmtDateTime(h.created_at, lang)} · {h.user_name}</p>
                    {h.note && <p className="mt-0.5 text-[13px] text-ink-500">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
