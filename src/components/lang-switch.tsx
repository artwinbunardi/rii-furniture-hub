import { setLanguageAction } from "@/app/auth-actions";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n/dict";

export function LangSwitch({ lang, back, className }: { lang: Lang; back: string; className?: string }) {
  return (
    <form action={setLanguageAction} className={cn("inline-flex rounded-lg border border-line bg-white p-0.5 text-[12px] font-medium", className)}>
      <input type="hidden" name="back" value={back} />
      {(["id", "en"] as const).map((l) => (
        <button key={l} name="lang" value={l} type="submit" aria-pressed={lang === l}
          className={cn("rounded-md px-2 py-1 uppercase transition", lang === l ? "bg-ink text-white" : "text-ink-500 hover:text-ink")}>
          {l}
        </button>
      ))}
    </form>
  );
}
