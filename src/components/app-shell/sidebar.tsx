"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Circle, AlertTriangle, BarChart3, Boxes, CalendarRange, FolderKanban, Hammer, History, Images, LayoutDashboard, LayoutGrid, MapPin, PackageCheck, PanelsTopLeft, ScanLine, ScrollText, Settings, SlidersHorizontal, Tags, Undo2, Users, Warehouse } from "lucide-react";
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { AlertTriangle, BarChart3, Boxes, CalendarRange, FolderKanban, Hammer, History, Images, LayoutDashboard, LayoutGrid, MapPin, PackageCheck, PanelsTopLeft, ScanLine, ScrollText, Settings, SlidersHorizontal, Tags, Undo2, Users, Warehouse };
import { RiiLogo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./nav";

type Labels = Record<string, string>;

export function Sidebar({ groups, labels, footer }: { groups: NavGroup[]; labels: Labels; footer: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const isActive = (href: string) => {
    if (!(path === href || path.startsWith(href + "/"))) return false;
    // prefer the most specific match
    return !allHrefs.some((h) => h !== href && h.startsWith(href + "/") && (path === h || path.startsWith(h + "/")));
  };
  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.key && <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-400">{labels[g.key]}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const Icon = ICONS[it.icon] ?? Circle;
              const active = isActive(it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} onClick={() => setOpen(false)}
                    className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition",
                      active ? "bg-canvas font-medium text-ink shadow-[inset_0_0_0_1px_#e8e8ec]" : "text-ink-500 hover:bg-canvas/70 hover:text-ink")}>
                    <Icon className={cn("h-[17px] w-[17px]", active ? "text-ink" : "text-ink-400")} />
                    {labels[it.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden no-print">
        <RiiLogo />
        <button aria-label="Menu" className="rounded-lg p-2 hover:bg-canvas" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
      </div>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-line bg-white lg:flex no-print">
        <div className="flex h-16 items-center border-b border-line px-5"><Link href="/"><RiiLogo /></Link></div>
        {nav}
        <div className="border-t border-line p-3">{footer}</div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-pop">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <RiiLogo />
              <button aria-label="Close" className="rounded-lg p-2 hover:bg-canvas" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {nav}
            <div className="border-t border-line p-3">{footer}</div>
          </aside>
        </div>
      )}
    </>
  );
}
