"use server";
import { notifyReservation } from "@/lib/services/notify";
import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/session";
import { run, str, type ActionState } from "@/lib/action";
import * as res from "@/lib/services/reservations";
import { AppError } from "@/lib/errors";

function qtyMap(fd: FormData, prefix: string) {
  const out: Record<string, number> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith(prefix)) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) throw new AppError("Jumlah harus bilangan bulat ≥ 0. / Quantities must be whole numbers ≥ 0.");
      out[k.slice(prefix.length)] = n;
    }
  }
  return out;
}

const done = (id: string, message: string): ActionState => {
  revalidatePath(`/app/reservations/${id}`);
  revalidatePath("/app", "layout");
  return { ok: true, message };
};

export async function reservationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = str(fd, "id");
    const op = str(fd, "op");
    const note = str(fd, "note") || undefined;
    switch (op) {
      case "approve": {
        const u = await authorize("reservation.approve");
        await res.approveReservation(u, id, { note, approvedQty: qtyMap(fd, "approve_") });
        await notifyReservation(u.ctx, id, "approved");
        return done(id, "Reservasi disetujui — stok dikunci untuk tanggal tersebut. / Approved — stock reserved for these dates.");
      }
      case "reject": {
        const u = await authorize("reservation.approve");
        await res.rejectReservation(u, id, str(fd, "reason"));
        await notifyReservation(u.ctx, id, "rejected");
        return done(id, "Reservasi ditolak. / Reservation rejected.");
      }
      case "cancel": {
        const u = await authorize();
        await res.cancelReservation(u, id, str(fd, "reason"));
        await notifyReservation(u.ctx, id, "cancelled");
        return done(id, "Reservasi dibatalkan. / Reservation cancelled.");
      }
      case "prepare": {
        const u = await authorize("warehouse.pick");
        await res.startPreparing(u, id);
        return done(id, "Status: disiapkan. / Status: preparing.");
      }
      case "pick": {
        const u = await authorize("warehouse.pick");
        await res.confirmPicking(u, id, qtyMap(fd, "pick_"), note);
        return done(id, "Picking dikonfirmasi — siap dikirim. / Picking confirmed — ready for dispatch.");
      }
      case "dispatch": {
        const u = await authorize("warehouse.checkout");
        await res.dispatchReservation(u, id, qtyMap(fd, "out_"), note);
        await notifyReservation(u.ctx, id, "dispatched");
        return done(id, "Barang tercatat keluar gudang. / Items checked out.");
      }
      case "return": {
        const u = await authorize("warehouse.checkin");
        const ret = qtyMap(fd, "ret_");
        const miss = qtyMap(fd, "miss_");
        const lines: Record<string, { returned: number; missing: number }> = {};
        for (const pid of new Set([...Object.keys(ret), ...Object.keys(miss)])) {
          if ((ret[pid] ?? 0) + (miss[pid] ?? 0) > 0) lines[pid] = { returned: ret[pid] ?? 0, missing: miss[pid] ?? 0 };
        }
        await res.registerReturn(u, id, lines, note);
        return done(id, "Pengembalian dicatat — menunggu inspeksi. / Return registered — pending inspection.");
      }
      case "inspect": {
        const u = await authorize("warehouse.inspect");
        const pid = str(fd, "product_id");
        await res.inspectReturn(u, id, pid, {
          good: Number(str(fd, "good") || 0), damaged: Number(str(fd, "damaged") || 0), lost: Number(str(fd, "lost") || 0),
          notes: note, severity: (str(fd, "severity") || "minor") as "minor", damageDescription: str(fd, "damage_description"),
        });
        return done(id, "Hasil inspeksi disimpan. / Inspection saved.");
      }
      default:
        throw new AppError("Unknown operation");
    }
  });
}
