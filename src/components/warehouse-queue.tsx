import Link from "next/link";
import { q } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate, todayJakarta } from "@/lib/utils";

export async function ReservationQueue({ ctx, where, params, lang, empty, dateCol = "loading_date" }: { ctx: any; where: string; params: unknown[]; lang: "id" | "en"; empty: string; dateCol?: string }) {
  const rows = await q(ctx, `SELECT r.id, r.number, r.status, r.loading_date, r.return_date, pr.name AS project, u.name AS requester,
      (SELECT coalesce(sum(qty_approved),0) FROM reservation_items WHERE reservation_id = r.id)::int AS units
    FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id JOIN users u ON u.id = r.requester_id WHERE ${where} ORDER BY r.${dateCol} LIMIT 50`, params);
  if (!rows.length) return <p className="p-5 text-sm text-ink-400">{empty}</p>;
  const today = todayJakarta();
  return (
    <table className="tbl">
      <tbody>{rows.map((r) => (
        <tr key={r.id}>
          <td><Link href={`/app/reservations/${r.id}`} className="link font-mono">{r.number}</Link><div className="max-w-[240px] truncate text-xs text-ink-400">{r.project}</div></td>
          <td className={`whitespace-nowrap text-sm ${r[dateCol] < today ? "font-medium text-red-600" : r[dateCol] === today ? "font-medium text-amber-700" : ""}`}>{fmtDate(r[dateCol], lang)}</td>
          <td className="text-right text-sm tabular-nums">{r.units} u</td>
          <td className="text-right"><StatusBadge status={r.status} lang={lang} /></td>
        </tr>
      ))}</tbody>
    </table>
  );
}

