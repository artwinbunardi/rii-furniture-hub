import * as Icons from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { getDraft } from "@/lib/services/website";
import { SECTIONS } from "@/lib/site/registry";
import { PageHeader, Card, Badge } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { lbl } from "@/components/builder/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sections" };

export default async function SectionsPage() {
  const user = await requireUser("website.edit");
  const [lang, { snapshot }] = await Promise.all([getLang(), getDraft(user.ctx)]);
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const usage = (type: string) => snapshot.pages.flatMap((p) => p.sections.filter((s) => s.type === type).map(() => p.title));
  const groups: [string, string][] = [["layout", T("Layout", "Tata letak")], ["products", T("Products (live inventory)", "Produk (inventaris live)")], ["content", T("Content", "Konten")], ["commerce", T("Reservation", "Reservasi")], ["functional", T("Functional (system pages only)", "Fungsional (khusus halaman sistem)")]];
  return (
    <>
      <PageHeader title={T("Section library", "Pustaka bagian")} subtitle={T("Every section can be added, duplicated, hidden, reordered and removed in the visual editor. Product sections read live inventory and availability.", "Setiap bagian dapat ditambah, diduplikat, disembunyikan, diurutkan dan dihapus di editor visual. Bagian produk membaca inventaris dan ketersediaan live.")}
        actions={<a href="/app/builder/editor" className={buttonClass("primary")}><Icons.MousePointerSquareDashed className="h-4 w-4" />{T("Open editor", "Buka editor")}</a>} />
      {groups.map(([g, label]) => (
        <section key={g} className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-400">{label}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SECTIONS.filter((s) => s.group === g).map((s) => {
              const Icon = ((Icons as any)[s.icon] ?? Icons.Square) as React.ComponentType<{ className?: string }>;
              const used = usage(s.type);
              return (
                <Card key={s.type} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-canvas p-2 text-ink-500"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{lbl(lang, s.label)}</p>
                      <p className="mt-0.5 text-[12px] text-ink-500">{s.variants.length} {T("layout variants", "varian tata letak")}: {s.variants.map((v) => v[1]).join(", ")}</p>
                      <p className="mt-2 text-[12px]">{used.length ? <Badge tone="green">{T("Used", "Dipakai")} {used.length}× · {[...new Set(used)].join(", ")}</Badge> : <Badge>{T("Not used in draft", "Belum dipakai di draf")}</Badge>}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
