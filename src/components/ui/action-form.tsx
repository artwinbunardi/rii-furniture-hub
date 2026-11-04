"use client";
import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action";
import { Alert } from "./misc";
import { buttonClass } from "./button";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (s: ActionState) => void;
  id?: string;
  showMessages?: boolean;
};

export function ActionForm({ action, children, className, successMessage, resetOnSuccess, onSuccess, id, showMessages = true }: Props) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form ref={ref} action={formAction} className={className} id={id}>
      {children}
      {showMessages && state?.error && <Alert tone="error" className="mt-3">{state.error}</Alert>}
      {showMessages && state?.ok && (state.message || successMessage) && <Alert tone="success" className="mt-3">{state.message || successMessage}</Alert>}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", size = "md", className, name, value, formAction, disabled }: {
  children: React.ReactNode; variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1]; className?: string;
  name?: string; value?: string; formAction?: (fd: FormData) => void; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} formAction={formAction} disabled={pending || disabled} className={cn(buttonClass(variant, size), className)} aria-busy={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Destructive / important actions: opens a confirmation dialog, then submits the
 * enclosing form (optionally with extra fields, e.g. a reason).
 */
export function ConfirmButton({ children, title, body, confirmLabel, cancelLabel = "Batal", variant = "danger", size = "md", className, name, value, requireReason, reasonLabel, reasonName = "reason" }: {
  children: React.ReactNode; title: string; body?: React.ReactNode; confirmLabel: string; cancelLabel?: string;
  variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1]; className?: string;
  name?: string; value?: string; requireReason?: boolean; reasonLabel?: string; reasonName?: string;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const hiddenSubmit = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = React.useState("");
  return (
    <>
      <button type="button" className={cn(buttonClass(variant, size), className)} onClick={() => dlg.current?.showModal()}>
        {children}
      </button>
      {requireReason && <input type="hidden" name={reasonName} value={reason} />}
      <button ref={hiddenSubmit} type="submit" name={name} value={value} className="hidden" aria-hidden tabIndex={-1} />
      <dialog ref={dlg} className="w-[min(92vw,440px)] rounded-2xl border border-line p-0 shadow-pop">
        <div className="p-5">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {body && <div className="mt-2 text-sm text-ink-500">{body}</div>}
          {requireReason && (
            <div className="mt-4">
              <label className="label">{reasonLabel ?? "Alasan / Reason"}</label>
              <textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">
          <button type="button" className={buttonClass("outline")} onClick={() => dlg.current?.close()}>{cancelLabel}</button>
          <button
            type="button"
            disabled={requireReason && !reason.trim()}
            className={buttonClass(variant === "danger" ? "danger" : "primary")}
            onClick={() => { dlg.current?.close(); setTimeout(() => hiddenSubmit.current?.click(), 0); }}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
