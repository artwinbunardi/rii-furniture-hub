import { Eye } from "lucide-react";

/** Thin bar shown above every builder preview so a draft is never mistaken for the live site. */
export function PreviewBanner({ label, tone = "amber", actions }: { label: string; tone?: "amber" | "blue" | "violet"; actions?: { href: string; label: string }[] }) {
  const c = tone === "blue" ? "bg-sky-600" : tone === "violet" ? "bg-violet-700" : "bg-amber-500";
  return (
    <div className={`relative z-[60] flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[13px] font-medium text-white ${c}`} data-preview-banner>
      <span className="flex items-center gap-2"><Eye className="h-4 w-4" />{label}</span>
      <span className="flex gap-3">{actions?.map((a) => <a key={a.href} href={a.href} className="underline underline-offset-2 hover:opacity-80">{a.label}</a>)}</span>
    </div>
  );
}
