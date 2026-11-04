import { RiiLogo } from "@/components/logo";
import { LangSwitch } from "@/components/lang-switch";
import type { Lang } from "@/lib/i18n/dict";

export function AuthShell({ children, lang, back }: { children: React.ReactNode; lang: Lang; back: string }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#1c1b1a] lg:block">
        <img src="/media/demo/banner-lounge.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <RiiLogo light />
          <div>
            <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
              {lang === "en" ? "One place for every piece of RII furniture." : "Satu tempat untuk seluruh koleksi furnitur RII."}
            </p>
            <p className="mt-3 max-w-md text-sm text-white/70">
              {lang === "en"
                ? "Browse the collection, reserve for your event project, and keep the warehouse in sync — in real time."
                : "Jelajahi koleksi, reservasi untuk proyek acara Anda, dan jaga gudang tetap sinkron — secara real time."}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-5">
          <span className="lg:hidden"><RiiLogo /></span>
          <span className="hidden lg:block" />
          <LangSwitch lang={lang} back={back} />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
