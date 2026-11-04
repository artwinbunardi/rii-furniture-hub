import { errorMessage } from "./errors";

export type ActionState = { ok?: boolean; error?: string; message?: string; data?: Record<string, unknown> } | null;

/** Wraps server-action logic: converts thrown errors into a user-visible message. */
export async function run(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    const r = await fn();
    return r ?? { ok: true };
  } catch (e) {
    // let Next.js redirects / notFound propagate
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND") || digest.startsWith("NEXT_HTTP_ERROR"))) throw e;
    return { ok: false, error: errorMessage(e) };
  }
}

export function str(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}
export function int(fd: FormData, k: string, dflt = 0): number {
  const v = str(fd, k);
  if (v === "") return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}
export function num(fd: FormData, k: string): number | null {
  const v = str(fd, k);
  if (v === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
