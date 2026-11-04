"use client";
import { useEffect, useRef, useState, useActionState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SLink } from "../link";
import { contactAction } from "@/app/(site)/actions";
import { tr, type Lang } from "@/lib/i18n/dict";

export function Slider({ slides, variant, autoplay }: { slides: { image: string; heading: string; text?: string; href?: string }[]; variant: string; autoplay: boolean }) {
  const [i, setI] = useState(0);
  const n = slides.length || 1;
  useEffect(() => {
    if (!autoplay || n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(t);
  }, [autoplay, n]);
  if (!slides.length) return null;
  const s = slides[i];
  const contained = variant === "contained";
  return (
    <div className={contained ? "s-container py-6" : ""}>
      <div className={`relative overflow-hidden ${contained ? "s-rounded" : ""}`} style={{ color: "#fff" }}>
        {slides.map((sl, k) => (
          <img key={k} src={sl.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700" style={{ opacity: k === i ? 1 : 0 }} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/0" />
        <div className={`relative flex min-h-[520px] items-center ${contained ? "px-10" : ""}`}>
          <div className={contained ? "" : "s-container w-full"}>
            <h2 className="s-heading max-w-2xl text-[40px] md:text-[60px]">{s.heading}</h2>
            {s.text && <p className="mt-4 max-w-lg opacity-85">{s.text}</p>}
            {s.href && <SLink href={s.href} className="s-btn mt-8">→</SLink>}
          </div>
        </div>
        {n > 1 && (
          <>
            <button aria-label="Previous" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur hover:bg-white/35"><ChevronLeft className="h-5 w-5" /></button>
            <button aria-label="Next" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur hover:bg-white/35"><ChevronRight className="h-5 w-5" /></button>
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">{slides.map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className="h-1.5 rounded-full bg-white transition-all" style={{ width: k === i ? 28 : 10, opacity: k === i ? 1 : 0.5 }} />)}</div>
          </>
        )}
      </div>
    </div>
  );
}

export function Scroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div className="relative">
      <div className="absolute -top-14 right-0 hidden gap-2 md:flex">
        <button aria-label="Previous" onClick={() => by(-1)} className="rounded-full border p-2 hover:opacity-70" style={{ borderColor: "var(--c-border)" }}><ChevronLeft className="h-4 w-4" /></button>
        <button aria-label="Next" onClick={() => by(1)} className="rounded-full border p-2 hover:opacity-70" style={{ borderColor: "var(--c-border)" }}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div ref={ref} className="flex snap-x gap-5 overflow-x-auto pb-3 [scrollbar-width:none]">{children}</div>
    </div>
  );
}

export function ContactForm({ lang, disabled, defaultName }: { lang: Lang; disabled?: boolean; defaultName?: string }) {
  const [state, action, pending] = useActionState(contactAction, null);
  const t = (k: string) => tr(lang, k);
  if (state?.ok) return <p className="py-10 text-center">{lang === "en" ? "Thank you — your message has been sent to the RII team." : "Terima kasih — pesan Anda telah dikirim ke tim RII."}</p>;
  return (
    <form action={action} className="space-y-3">
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <input name="name" required placeholder={t("name")} defaultValue={defaultName} className="s-input" disabled={disabled} />
      <input name="email" type="email" required placeholder={t("email")} className="s-input" disabled={disabled} />
      <textarea name="message" required rows={5} placeholder={lang === "en" ? "Message" : "Pesan"} className="s-input" disabled={disabled} />
      {state?.error && <p className="text-[13px] text-red-600">{state.error}</p>}
      <button className="s-btn w-full" disabled={disabled || pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{lang === "en" ? "Send message" : "Kirim pesan"}</button>
    </form>
  );
}
