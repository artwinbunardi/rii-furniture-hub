import type { SectionProps } from "../types";
import { CartView } from "./cart-client";
import { CancelReservationForm, DraftActions } from "./reservation-client";
import { SLink } from "../link";
import { Editable } from "../editable";
import { LoginForm } from "@/components/auth/login-form";
import { tr } from "@/lib/i18n/dict";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { statusTone } from "@/lib/status";
import { ShoppingBag, ClipboardList, CheckCircle2 } from "lucide-react";

const TONE_COLORS: Record<string, [string, string]> = {
  gray: ["#f1f1f2", "#45454b"], amber: ["#fdf3df", "#8a5a00"], green: ["#e6f6ec", "#17663a"], red: ["#fdecec", "#a12a2a"],
  blue: ["#e7f2fb", "#1e5f8f"], violet: ["#f0ebfb", "#5b3aa5"], teal: ["#e3f5f3", "#11665d"], slate: ["#2b2f36", "#ffffff"],
};

export function SiteStatus({ status, lang }: { status: string; lang: "id" | "en" }) {
  const [bg, fg] = TONE_COLORS[statusTone(status)] ?? TONE_COLORS.gray;
  return <span className="s-pill" style={{ background: bg, color: fg }} data-testid="status-badge"><span className="h-1.5 w-1.5 rounded-full bg-current" />{tr(lang, `st_${status}`)}</span>;
}

export function CartSection({ section: s, data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  const page = data.page.kind === "cart" ? data.page : null;
  const cart = page?.cart;
  return (
    <div className="s-container py-10 md:py-14">
      <Editable as="h1" sectionId={s.id} field="heading" value={s.props.heading || t("cart")} className="s-heading mb-8 text-[32px] md:text-[44px]" />
      {!data.user?.canReserve ? (
        <p className="s-muted">{data.lang === "en" ? "Your role cannot create reservations." : "Peran Anda tidak dapat membuat reservasi."}</p>
      ) : !cart || cart.items.length === 0 ? (
        <div className="border border-dashed py-20 text-center s-rounded" style={{ borderColor: "var(--c-border)" }}>
          <ShoppingBag className="s-muted mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">{t("cart_empty")}</p>
          <SLink href="/products" className="s-btn mt-5">{t("browse_catalog")}</SLink>
        </div>
      ) : (
        <CartView cart={cart} projects={page!.projects} lang={data.lang} single={s.variant === "single"} canCreateProject={data.user.canReserve} />
      )}
    </div>
  );
}

export function MyReservationsSection({ section: s, data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  const page = data.page.kind === "reservations" ? data.page : null;
  const list = page?.list ?? [];
  const drafts = list.filter((r) => r.status === "draft");
  const others = list.filter((r) => r.status !== "draft");
  const row = (r: any) => (
    <SLink key={r.id} href={`/my-reservations/${r.id}`} className="grid grid-cols-2 items-center gap-3 py-4 hover:opacity-80 md:grid-cols-[150px_1fr_200px_90px_170px]" data-testid="my-res-row">
      <span className="font-mono text-[13px] font-medium">{r.number ?? t("st_draft")}</span>
      <span className="truncate">{r.project_name ?? "—"}<span className="s-muted block text-[12px]">{r.project_code}</span></span>
      <span className="s-muted text-[13px]">{fmtDate(r.loading_date, data.lang)} – {fmtDate(r.return_date, data.lang)}</span>
      <span className="text-[13px]">{r.units} {t("units")}</span>
      <span className="md:text-right"><SiteStatus status={r.status} lang={data.lang} /></span>
    </SLink>
  );
  return (
    <div className="s-container py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <Editable as="h1" sectionId={s.id} field="heading" value={s.props.heading || t("my_reservations")} className="s-heading text-[32px] md:text-[44px]" />
        <div className="flex gap-2"><SLink href="/cart" className="s-btn s-btn-ghost s-btn-sm">{t("cart")}{data.cartCount ? ` (${data.cartCount})` : ""}</SLink><SLink href="/products" className="s-btn s-btn-sm">{t("browse_catalog")}</SLink></div>
      </div>
      {drafts.length > 0 && (
        <div className="mb-10">
          <h2 className="s-heading mb-3 text-[18px]">{data.lang === "en" ? "Saved drafts" : "Draf tersimpan"}</h2>
          <div className="divide-y border-y" style={{ borderColor: "var(--c-border)" }}>
            {drafts.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3" style={{ borderColor: "var(--c-border)" }}>
                <span>{r.project_name ?? t("st_draft")} <span className="s-muted text-[13px]">· {r.lines} {t("items").toLowerCase()} · {r.units} {t("units")}</span></span>
                <DraftActions id={r.id} lang={data.lang} />
              </div>
            ))}
          </div>
        </div>
      )}
      {others.length === 0 ? (
        <div className="border border-dashed py-16 text-center s-rounded" style={{ borderColor: "var(--c-border)" }}>
          <ClipboardList className="s-muted mx-auto h-8 w-8" /><p className="mt-3">{t("no_data")}</p>
        </div>
      ) : s.variant === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {others.map((r) => (
            <SLink key={r.id} href={`/my-reservations/${r.id}`} className="border p-5 s-rounded hover:shadow-md" style={{ borderColor: "var(--c-border)" }}>
              <div className="flex items-center justify-between"><span className="font-mono text-[13px] font-medium">{r.number}</span><SiteStatus status={r.status} lang={data.lang} /></div>
              <p className="s-heading mt-3 text-[18px]">{r.project_name}</p>
              <p className="s-muted mt-1 text-[13px]">{fmtDate(r.loading_date, data.lang)} – {fmtDate(r.return_date, data.lang)} · {r.units} {t("units")}</p>
            </SLink>
          ))}
        </div>
      ) : (
        <div className="divide-y border-y" style={{ borderColor: "var(--c-border)" }}>{others.map(row)}</div>
      )}
    </div>
  );
}

export function ReservationDetailSection({ data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  const r = data.page.kind === "reservation" ? data.page.detail : null;
  if (!r) return <div className="s-container py-16 s-muted">{t("reservation_detail")}</div>;
  const canCancel = data.user?.id === r.requester_id && ["draft", "pending_approval", "approved"].includes(r.status);
  const info: [string, string | null][] = [
    [t("project"), r.project_name ? `${r.project_code} — ${r.project_name}` : null],
    [t("client_event"), [r.client_name, r.event_name].filter(Boolean).join(" · ") || null],
    [t("requester"), r.requester_name],
    [t("department"), r.department],
    [t("event_location"), r.event_location],
    [t("loading_date"), fmtDate(r.loading_date, data.lang)],
    [t("return_date"), fmtDate(r.return_date, data.lang)],
    [t("special_instructions"), r.special_instructions],
  ];
  return (
    <div className="s-container py-10 md:py-14">
      <SLink href="/my-reservations" className="s-muted text-[13px] hover:underline">← {t("my_reservations")}</SLink>
      {data.page.kind === "reservation" && (data.page as any).submitted && (
        <div className="mt-4 flex items-center gap-2 p-4 s-rounded" style={{ background: "#e6f6ec", color: "#17663a" }} data-testid="submitted-banner">
          <CheckCircle2 className="h-5 w-5" />{t("submitted")}: <strong className="font-mono">{r.number}</strong>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="s-eyebrow">{t("reservation_number")}</p>
          <h1 className="s-heading font-mono text-[30px] md:text-[38px]" data-testid="reservation-number">{r.number ?? t("st_draft")}</h1>
        </div>
        <SiteStatus status={r.status} lang={data.lang} />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="divide-y border-y" style={{ borderColor: "var(--c-border)" }}>
            {r.items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-4 py-3" style={{ borderColor: "var(--c-border)" }}>
                <img src={it.image ?? ""} alt="" className="h-16 w-20 object-cover s-rounded" />
                <div className="min-w-0 flex-1"><SLink href={`/products/${it.slug}`} className="font-medium hover:underline">{it.name}</SLink><p className="s-muted font-mono text-[12px]">{it.sku}</p></div>
                <div className="grid grid-cols-3 gap-4 text-center text-[12px]">
                  <div><p className="s-muted">{t("requested")}</p><p className="text-[15px] font-semibold">{it.qty_requested}</p></div>
                  <div><p className="s-muted">{t("approved_qty")}</p><p className="text-[15px] font-semibold">{["draft", "pending_approval", "rejected", "cancelled"].includes(r.status) ? "—" : it.qty_approved}</p></div>
                  <div><p className="s-muted">{t("returned_qty")}</p><p className="text-[15px] font-semibold">{it.qty_checked_out ? `${it.qty_returned}/${it.qty_checked_out}` : "—"}</p></div>
                </div>
              </div>
            ))}
          </div>
          {r.status === "rejected" && r.rejection_reason && <p className="mt-4 p-3 text-[14px] s-rounded" style={{ background: "#fdecec", color: "#a12a2a" }}>{t("reason")}: {r.rejection_reason}</p>}
          {canCancel && <div className="mt-6"><CancelReservationForm id={r.id} lang={data.lang} /></div>}
        </div>
        <aside className="space-y-6">
          <dl className="space-y-2.5 border p-5 text-[14px] s-rounded" style={{ borderColor: "var(--c-border)" }}>
            {info.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="s-muted text-[12px]">{k}</dt><dd className="whitespace-pre-line">{v}</dd></div>)}
            {r.approver_name && <div><dt className="s-muted text-[12px]">{t("approval_info")}</dt><dd>{r.approver_name} · {fmtDateTime(r.approved_at, data.lang)}{r.approval_note ? ` — ${r.approval_note}` : ""}</dd></div>}
          </dl>
          <div className="border p-5 s-rounded" style={{ borderColor: "var(--c-border)" }}>
            <p className="mb-3 text-[14px] font-medium">{t("history")}</p>
            <ol className="space-y-3 border-l pl-4 text-[13px]" style={{ borderColor: "var(--c-border)" }}>
              {r.history.map((h: any) => (
                <li key={h.id} className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full" style={{ background: "var(--c-accent)" }} />
                  <p className="font-medium">{tr(data.lang, `st_${h.to_status}`)}</p>
                  <p className="s-muted">{fmtDateTime(h.created_at, data.lang)} · {h.user_name}</p>
                  {h.note && <p className="s-muted italic">{h.note}</p>}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function AccountSection({ data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  const acc = data.page.kind === "account" ? data.page.account : null;
  return (
    <div className="s-container max-w-3xl py-10 md:py-14">
      <h1 className="s-heading text-[32px] md:text-[44px]">{t("my_account")}</h1>
      {acc ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="border p-5 s-rounded" style={{ borderColor: "var(--c-border)" }}>
            <p className="s-heading text-[20px]">{acc.name}</p>
            <p className="s-muted text-[14px]">{acc.email}</p>
            <p className="mt-3 text-[14px]">{acc.roles.join(", ")}</p>
            <p className="s-muted text-[14px]">{acc.department}</p>
            <SLink href="/app/profile" className="s-btn s-btn-ghost s-btn-sm mt-5">{t("edit")} {t("profile").toLowerCase()} / {t("password").toLowerCase()}</SLink>
          </div>
          <div className="border p-5 s-rounded" style={{ borderColor: "var(--c-border)" }}>
            <p className="font-medium">{t("my_reservations")}</p>
            <p className="s-heading mt-2 text-[36px]">{acc.reservationCount}</p>
            <p className="s-muted text-[13px]">{acc.activeCount} {data.lang === "en" ? "active" : "aktif"}</p>
            <SLink href="/my-reservations" className="s-btn s-btn-sm mt-4">{t("view_all")}</SLink>
          </div>
          <div className="border p-5 s-rounded md:col-span-2" style={{ borderColor: "var(--c-border)" }}>
            <p className="font-medium">{t("my_wishlists")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SLink href="/products?favorites=1" className="rounded-full border px-4 py-1.5 text-[13px]" style={{ borderColor: "var(--c-border)" }}>♥ {t("favorites")} ({acc.favoriteCount})</SLink>
              {acc.wishlists.map((w: any) => <SLink key={w.id} href={`/collections/${w.slug}`} className="rounded-full border px-4 py-1.5 text-[13px]" style={{ borderColor: "var(--c-border)" }}>{w.name} ({w.count})</SLink>)}
            </div>
          </div>
        </div>
      ) : <p className="s-muted mt-6">—</p>}
    </div>
  );
}

export function LoginSection({ section: s, data }: SectionProps) {
  const next = data.page.kind === "login" ? data.page.next : undefined;
  const form = (
    <div className="w-full max-w-sm">
      <Editable as="h1" sectionId={s.id} field="heading" value={s.props.heading} className="s-heading text-[30px]" />
      <Editable as="p" sectionId={s.id} field="text" value={s.props.text} className="s-muted mb-6 mt-2" />
      {data.user ? <p>{data.user.name} ✓ <SLink href="/products" className="s-link">→</SLink></p> : data.editor ? <div className="space-y-3"><div className="s-input">email</div><div className="s-input">••••••</div><div className="s-btn w-full">Login</div></div> : <LoginForm lang={data.lang} next={next} />}
    </div>
  );
  if (s.variant === "split")
    return (
      <div className="grid min-h-[70vh] md:grid-cols-2">
        <img src={s.props.image || "/media/demo/banner-lounge.svg"} alt="" className="hidden h-full w-full object-cover md:block" />
        <div className="flex items-center justify-center p-8">{form}</div>
      </div>
    );
  return <div className="flex min-h-[70vh] items-center justify-center p-8"><div className="w-full max-w-md border p-8 s-rounded" style={{ borderColor: "var(--c-border)" }}>{form}</div></div>;
}
