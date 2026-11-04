"use client";
import { useState, useTransition, useActionState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Trash2, AlertTriangle, CheckCircle2, FolderPlus, Info } from "lucide-react";
import { updateCartAction, setCartQtyAction, saveDraftAction, submitCartAction, quickCreateProjectAction } from "@/app/(site)/cart-actions";
import { SLink } from "../link";
import { useEditor } from "../editable";
import { tr, type Lang } from "@/lib/i18n/dict";
import { fmtDate, todayJakarta } from "@/lib/utils";

type Item = { product_id: string; sku: string; name: string; slug: string; image: string | null; qty_requested: number };
type Cart = {
  id: string; project_id: string | null; loading_date: string | null; return_date: string | null; event_location: string | null;
  department: string | null; special_instructions: string | null; items: Item[];
  availability: Record<string, { available: number; pending: number; usable: number }>;
};
type Project = { id: string; code: string; name: string; location: string | null; start_date: string | null; end_date: string | null };

export function CartView({ cart, projects: initialProjects, lang, single, canCreateProject }: { cart: Cart; projects: Project[]; lang: Lang; single?: boolean; canCreateProject: boolean }) {
  const t = (k: string) => tr(lang, k);
  const router = useRouter();
  const ed = useEditor();
  const [projects, setProjects] = useState(initialProjects);
  const [projectId, setProjectId] = useState(cart.project_id ?? "");
  const [state, formAction, saving] = useActionState(updateCartAction, null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const hasDates = !!(cart.loading_date && cart.return_date);
  const issues = cart.items.filter((i) => hasDates && (cart.availability[i.product_id]?.available ?? 0) < i.qty_requested);
  const units = cart.items.reduce((a, i) => a + i.qty_requested, 0);
  const project = projects.find((p) => p.id === projectId);
  const ready = !!projectId && hasDates && cart.items.length > 0 && issues.length === 0;
  const canSave = cart.items.length > 0;

  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);

  const setQty = (pid: string, q: number) => start(async () => { setErr(null); const r = await setCartQtyAction(cart.id, pid, q); if (r?.error) setErr(r.error); router.refresh(); });
  const act = (fn: () => Promise<{ error?: string } | null | undefined>) => start(async () => { if (ed) return; setErr(null); const r = await fn(); if (r?.error) setErr(r.error); });

  const details = (
    // onSubmit instead of action={…}: React 19 auto-resets forms after an action, which would
    // silently clear the controlled project <select> in the DOM and submit an empty project
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => formAction(fd)); }} className="space-y-4" id="cart-details">
      <input type="hidden" name="reservation_id" value={cart.id} />
      <div>
        <label className="s-muted mb-1 block text-[12px]">{t("project")} *</label>
        <div className="flex gap-2">
          <select name="project_id" data-testid="project-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="s-input">
            <option value="">{t("select_project")}</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
          {canCreateProject && <button type="button" onClick={() => setShowNew(!showNew)} className="s-btn s-btn-ghost s-btn-sm" title={t("new_project")}><FolderPlus className="h-4 w-4" /></button>}
        </div>
        {project && <p className="s-muted mt-1 text-[12px]">{project.location}{project.start_date ? ` · ${fmtDate(project.start_date, lang)} – ${fmtDate(project.end_date, lang)}` : ""}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px]"><span className="s-muted mb-1 block">{t("loading_date")} *</span><input type="date" name="loading_date" data-testid="cart-from" defaultValue={cart.loading_date ?? ""} min={todayJakarta()} className="s-input" /></label>
        <label className="text-[12px]"><span className="s-muted mb-1 block">{t("return_date")} *</span><input type="date" name="return_date" data-testid="cart-to" defaultValue={cart.return_date ?? ""} min={todayJakarta()} className="s-input" /></label>
      </div>
      <label className="block text-[12px]"><span className="s-muted mb-1 block">{t("event_location")}</span><input name="event_location" defaultValue={cart.event_location ?? project?.location ?? ""} className="s-input" /></label>
      <label className="block text-[12px]"><span className="s-muted mb-1 block">{t("department")}</span><input name="department" defaultValue={cart.department ?? ""} className="s-input" /></label>
      <label className="block text-[12px]"><span className="s-muted mb-1 block">{t("special_instructions")}</span><textarea name="special_instructions" rows={3} defaultValue={cart.special_instructions ?? ""} className="s-input" /></label>
      <button type="submit" className="s-btn s-btn-ghost w-full" data-testid="save-details" disabled={saving || !!ed}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t("save")} & {lang === "en" ? "check availability" : "cek ketersediaan"}</button>
      {state?.error && <p className="text-[13px] text-red-600">{state.error}</p>}
    </form>
  );

  return (
    <div className={`grid gap-8 ${single ? "" : "lg:grid-cols-[1.5fr_1fr]"}`}>
      <div>
        {!hasDates && <div className="mb-4 flex items-start gap-2 p-3 text-[13px] s-rounded" style={{ background: "#fdf3df", color: "#7a4e00" }}><Info className="mt-0.5 h-4 w-4 shrink-0" />{t("select_dates_hint")}</div>}
        <div className="divide-y border-y" style={{ borderColor: "var(--c-border)" }}>
          {cart.items.map((it) => {
            const a = cart.availability[it.product_id];
            const short = hasDates && a && a.available < it.qty_requested;
            return (
              <div key={it.product_id} className="flex gap-4 py-4" style={{ borderColor: "var(--c-border)" }} data-testid="cart-line">
                <SLink href={`/products/${it.slug}`} className="shrink-0"><img src={it.image ?? ""} alt="" className="h-20 w-24 object-cover s-rounded" /></SLink>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div><SLink href={`/products/${it.slug}`} className="font-medium hover:underline">{it.name}</SLink><p className="s-muted font-mono text-[12px]">{it.sku}</p></div>
                    <button aria-label={t("remove")} disabled={pending} onClick={() => setQty(it.product_id, 0)} className="s-muted p-1 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-[var(--btn-radius)] border" style={{ borderColor: "var(--c-border)" }}>
                      <button aria-label="-" disabled={pending || it.qty_requested <= 1} onClick={() => setQty(it.product_id, it.qty_requested - 1)} className="px-2.5 py-1.5"><Minus className="h-3.5 w-3.5" /></button>
                      <input aria-label={t("quantity")} key={it.qty_requested} defaultValue={it.qty_requested} type="number" min={1} className="w-12 bg-transparent text-center text-[14px] outline-none"
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== it.qty_requested && v > 0) setQty(it.product_id, v); }} />
                      <button aria-label="+" disabled={pending} onClick={() => setQty(it.product_id, it.qty_requested + 1)} className="px-2.5 py-1.5"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    {hasDates && a && (
                      short
                        ? <span className="s-pill s-avail-none" data-testid="line-short"><AlertTriangle className="h-3.5 w-3.5" />{lang === "en" ? `Only ${a.available} available` : `Hanya ${a.available} tersedia`}</span>
                        : <span className="s-pill s-avail-ok"><CheckCircle2 className="h-3.5 w-3.5" />{a.available} {t("available").toLowerCase()}{a.pending ? ` · ${a.pending} pending` : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <SLink href="/products" className="s-link mt-4 inline-block text-[14px]">← {t("browse_catalog")}</SLink>
      </div>
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="border p-5 s-rounded" style={{ borderColor: "var(--c-border)" }}>
          <h2 className="s-heading mb-4 text-[18px]">{t("reservation_summary")}</h2>
          {details}
          {showNew && <NewProject lang={lang} onCreated={(p) => { setProjects([...projects, p]); setProjectId(p.id); setShowNew(false); }} />}
          <dl className="mt-5 space-y-2 border-t pt-4 text-[14px]" style={{ borderColor: "var(--c-border)" }}>
            <div className="flex justify-between"><dt className="s-muted">{t("items")}</dt><dd>{cart.items.length}</dd></div>
            <div className="flex justify-between"><dt className="s-muted">{t("total")} {t("units")}</dt><dd>{units}</dd></div>
            {hasDates && <div className="flex justify-between"><dt className="s-muted">{t("date")}</dt><dd>{fmtDate(cart.loading_date, lang)} – {fmtDate(cart.return_date, lang)}</dd></div>}
          </dl>
          {issues.length > 0 && <p className="mt-3 text-[13px] text-red-600">{lang === "en" ? "Some items exceed availability. Reduce quantities or change dates." : "Beberapa item melebihi ketersediaan. Kurangi jumlah atau ubah tanggal."}</p>}
          {err && <p className="mt-3 text-[13px] text-red-600" role="alert">{err}</p>}
          <div className="mt-5 grid gap-2">
            <button className="s-btn w-full" data-testid="submit-reservation" disabled={!ready || pending || !!ed} onClick={() => act(async () => {
              const form = document.getElementById("cart-details") as HTMLFormElement | null;
              if (form) { const r = await updateCartAction(null, new FormData(form)); if (r?.error) return r; }
              return submitCartAction(cart.id);
            })}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{t("submit_reservation")}</button>
            <button className="s-btn s-btn-ghost w-full" disabled={pending || !!ed || !canSave} onClick={() => act(async () => {
              const form = document.getElementById("cart-details") as HTMLFormElement | null;
              if (form) { const r = await updateCartAction(null, new FormData(form)); if (r?.error) return r; }
              return saveDraftAction(cart.id);
            })}>{t("save_draft")}</button>
          </div>
          {!ready && cart.items.length > 0 && <p className="s-muted mt-2 text-[12px]">{lang === "en" ? "Select a project and dates, then save to enable submission." : "Pilih proyek dan tanggal, lalu simpan untuk dapat mengajukan."}</p>}
          <p className="s-muted mt-4 text-[11.5px] leading-relaxed">{t("hold_policy")}</p>
        </div>
      </aside>
    </div>
  );
}

function NewProject({ lang, onCreated }: { lang: Lang; onCreated: (p: Project) => void }) {
  const [state, action, pending] = useActionState(quickCreateProjectAction, null);
  const t = (k: string) => tr(lang, k);
  useEffect(() => {
    if (state?.ok && state.data) onCreated({ ...(state.data as any), start_date: null, end_date: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form action={action} className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: "var(--c-border)" }}>
      <p className="text-[13px] font-medium">{t("new_project")}</p>
      <input name="name" required placeholder={t("name")} className="s-input" />
      <div className="grid grid-cols-2 gap-2"><input name="client_name" placeholder="Klien / Client" className="s-input" /><input name="event_name" placeholder="Acara / Event" className="s-input" /></div>
      <input name="location" placeholder={t("event_location")} className="s-input" />
      <div className="grid grid-cols-2 gap-2"><input type="date" name="start_date" className="s-input" /><input type="date" name="end_date" className="s-input" /></div>
      {state?.error && <p className="text-[12px] text-red-600">{state.error}</p>}
      <button className="s-btn s-btn-sm w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{t("create")}</button>
    </form>
  );
}
