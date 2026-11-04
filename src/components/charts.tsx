"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Validated reference palette (light surface): slot 1 blue, slot 2 orange. Text stays in ink tokens.
const S1 = "#2a78d6";
const S2 = "#eb6834";
const GRID = "#ececef";
const AXIS = "#8a8a93";

const fmtDay = (iso: string, lang: "id" | "en") => new Date(iso + "T00:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "short" });

function Tip({ active, payload, label, lang, kind }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string; lang: "id" | "en"; kind: "weekly" }) {
  if (!active || !payload?.length || !label) return null;
  const en = lang === "en";
  const names: Record<string, string> = { n: en ? "Submitted" : "Diajukan", approved: en ? "Approved" : "Disetujui" };
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-ink">{kind === "weekly" && `${en ? "Week of" : "Minggu"} ${fmtDay(label, lang)}`}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-700">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {names[p.dataKey]}: <span className="ml-auto font-medium tabular-nums text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink-500">
      {items.map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
    </div>
  );
}

export function UtilizationChart({ data, usable, lang }: { data: { day: string; hard: number; soft: number }[]; usable: number; lang: "id" | "en" }) {
  const en = lang === "en";
  // Plotted as % of usable units so the single axis is the utilization KPI itself.
  const rows = data.map((d) => ({ day: d.day, hard: usable ? +(100 * d.hard / usable).toFixed(1) : 0, soft: usable ? +(100 * d.soft / usable).toFixed(1) : 0, hardU: d.hard, softU: d.soft }));
  const peak = Math.max(0, ...rows.map((r) => r.hard + r.soft));
  const top = Math.min(100, Math.max(10, Math.ceil((peak * 1.15) / 10) * 10));
  return (
    <div>
      <Legend items={[[S1, en ? "Confirmed holds" : "Ditahan (disetujui)"], [S2, en ? "Awaiting approval" : "Menunggu persetujuan"]]} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="day" tickFormatter={(d) => fmtDay(d, lang)} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, top]} ticks={[0, top / 2, top]} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<UtilTip lang={lang} usable={usable} />} cursor={{ stroke: AXIS, strokeDasharray: "3 3" }} />
            <ReferenceLine x={rows.find((r) => r.day >= new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }))?.day} stroke={AXIS} strokeDasharray="3 3" label={{ value: en ? "today" : "hari ini", position: "insideTopLeft", fill: AXIS, fontSize: 11 }} />
            <Area isAnimationActive={false} type="stepAfter" dataKey="hard" stackId="1" stroke={S1} strokeWidth={2} fill={S1} fillOpacity={0.18} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
            <Area isAnimationActive={false} type="stepAfter" dataKey="soft" stackId="1" stroke="none" fill={S2} fillOpacity={0.35} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function UtilTip({ active, payload, label, lang, usable }: { active?: boolean; payload?: { dataKey: string; value: number; color: string; payload: { hardU: number; softU: number } }[]; label?: string; lang: "id" | "en"; usable: number }) {
  if (!active || !payload?.length || !label) return null;
  const en = lang === "en";
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-ink">{fmtDay(label, lang)}</p>
      <p className="flex items-center gap-2 text-ink-700"><span className="inline-block h-2 w-2 rounded-full" style={{ background: S1 }} />{en ? "Confirmed" : "Disetujui"}: <span className="ml-auto font-medium tabular-nums text-ink">{row.hardU} unit</span></p>
      <p className="flex items-center gap-2 text-ink-700"><span className="inline-block h-2 w-2 rounded-full" style={{ background: S2 }} />{en ? "Awaiting approval" : "Menunggu"}: <span className="ml-auto font-medium tabular-nums text-ink">{row.softU} unit</span></p>
      <p className="mt-1 text-ink-500">{en ? "Utilization" : "Utilisasi"}: {usable ? Math.round(100 * row.hardU / usable) : 0}% {en ? "of" : "dari"} {usable} {en ? "usable units" : "unit usable"}</p>
    </div>
  );
}

export function WeeklyChart({ data, lang }: { data: { week: string; n: number; approved: number }[]; lang: "id" | "en" }) {
  const en = lang === "en";
  return (
    <div>
      <Legend items={[[S1, en ? "Submitted" : "Diajukan"], [S2, en ? "Approved" : "Disetujui"]]} />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barGap={2}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tickFormatter={(d) => fmtDay(d, lang)} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<Tip lang={lang} kind="weekly" />} cursor={{ fill: "rgba(17,17,19,.04)" }} />
            <Bar isAnimationActive={false} dataKey="n" fill={S1} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar isAnimationActive={false} dataKey="approved" fill={S2} radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
