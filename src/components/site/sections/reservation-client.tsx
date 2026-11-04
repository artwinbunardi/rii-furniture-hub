"use client";
import { useActionState, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelOwnReservationAction, resumeDraftAction, deleteDraftAction } from "@/app/(site)/cart-actions";
import { tr, type Lang } from "@/lib/i18n/dict";

export function CancelReservationForm({ id, lang }: { id: string; lang: Lang }) {
  const [state, action, pending] = useActionState(cancelOwnReservationAction, null);
  const dlg = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const t = (k: string) => tr(lang, k);
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  return (
    <>
      <button type="button" className="s-btn s-btn-ghost" style={{ color: "#b42318" }} onClick={() => dlg.current?.showModal()}>{t("cancel_reservation")}</button>
      {state?.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}
      <dialog ref={dlg} className="w-[min(92vw,420px)] rounded-2xl p-0 shadow-2xl">
        <form action={action} className="p-6" onSubmit={() => dlg.current?.close()}>
          <input type="hidden" name="id" value={id} />
          <h3 className="text-lg font-semibold">{t("cancel_reservation")}?</h3>
          <p className="mt-1 text-sm text-zinc-500">{lang === "en" ? "Reserved stock will be released for other projects." : "Stok yang dipesan akan dilepas untuk proyek lain."}</p>
          <label className="mt-4 block text-sm">{t("reason")}<textarea name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2" rows={3} /></label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => dlg.current?.close()}>{t("close")}</button>
            <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white">{t("confirm")}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function DraftActions({ id, lang }: { id: string; lang: Lang }) {
  const [state, del, pending] = useActionState(deleteDraftAction, null);
  const router = useRouter();
  const t = (k: string) => tr(lang, k);
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  return (
    <div className="flex items-center gap-2">
      <form action={resumeDraftAction}><input type="hidden" name="id" value={id} /><button className="s-btn s-btn-sm">{lang === "en" ? "Continue" : "Lanjutkan"}</button></form>
      <form action={del} onSubmit={(e) => { if (!confirm(t("are_you_sure"))) e.preventDefault(); }}><input type="hidden" name="id" value={id} /><button disabled={pending} className="s-btn s-btn-ghost s-btn-sm">{t("delete")}</button></form>
      {state?.error && <span className="text-[12px] text-red-600">{state.error}</span>}
    </div>
  );
}
