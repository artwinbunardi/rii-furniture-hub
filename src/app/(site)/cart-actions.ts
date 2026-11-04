"use server";
import { notifyReservation } from "@/lib/services/notify";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/session";
import { run, str, type ActionState } from "@/lib/action";
import * as res from "@/lib/services/reservations";
import { createProject } from "@/lib/services/projects";

export async function updateCartAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("reservation.create");
    await res.updateDraft(u, str(fd, "reservation_id"), {
      project_id: str(fd, "project_id") || null,
      loading_date: str(fd, "loading_date") || null,
      return_date: str(fd, "return_date") || null,
      event_location: str(fd, "event_location") || null,
      department: str(fd, "department") || null,
      special_instructions: str(fd, "special_instructions") || null,
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Tersimpan. / Saved." };
  });
}

export async function setCartQtyAction(reservationId: string, productId: string, qty: number): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("reservation.create");
    await res.setItemQty(u, reservationId, productId, qty);
    revalidatePath("/", "layout");
  });
}

export async function saveDraftAction(reservationId: string): Promise<ActionState> {
  const r = await run(async () => {
    const u = await authorize("reservation.create");
    await res.saveCartAsDraft(u, reservationId);
  });
  if (r?.ok) { revalidatePath("/", "layout"); redirect("/my-reservations?saved=1"); }
  return r;
}

export async function submitCartAction(reservationId: string): Promise<ActionState> {
  let id = "";
  const r = await run(async () => {
    const u = await authorize("reservation.create");
    id = (await res.submitReservation(u, reservationId)).id;
    await notifyReservation(u.ctx, id, "submitted");
  });
  if (r?.ok) { revalidatePath("/", "layout"); redirect(`/my-reservations/${id}?submitted=1`); }
  return r;
}

export async function quickCreateProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize(["project.create", "project.manage"]);
    const p = await createProject(u, {
      name: str(fd, "name"), client_name: str(fd, "client_name"), event_name: str(fd, "event_name"),
      location: str(fd, "location"), start_date: str(fd, "start_date"), end_date: str(fd, "end_date"), department: u.department ?? undefined,
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `${p.code} dibuat. / created.`, data: { id: p.id, code: p.code, name: p.name, location: p.location } };
  });
}

export async function cancelOwnReservationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize();
    await res.cancelReservation(u, str(fd, "id"), str(fd, "reason"));
    revalidatePath("/", "layout");
    return { ok: true, message: "Reservasi dibatalkan. / Reservation cancelled." };
  });
}

export async function resumeDraftAction(fd: FormData) {
  const u = await authorize("reservation.create");
  await res.resumeDraft(u, str(fd, "id"));
  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function deleteDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("reservation.create");
    await res.deleteDraft(u, str(fd, "id"));
    revalidatePath("/", "layout");
  });
}
