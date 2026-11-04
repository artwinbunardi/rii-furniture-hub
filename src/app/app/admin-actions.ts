"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth/session";
import { run, str, int, type ActionState } from "@/lib/action";
import { AppError } from "@/lib/errors";
import * as admin from "@/lib/services/admin";
import { createProject, updateProject, type ProjectInput } from "@/lib/services/projects";

const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true" || fd.get(k) === "1";

/* categories */
export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("category.manage");
    const id = str(fd, "id") || null;
    await admin.saveCategory(u, id, { name_id: str(fd, "name_id"), name_en: str(fd, "name_en"), slug: str(fd, "slug"), parent_id: str(fd, "parent_id"), description: str(fd, "description"), sort: int(fd, "sort"), is_active: bool(fd, "is_active") });
    revalidatePath("/app/categories");
    return { ok: true, message: id ? "Kategori disimpan. / Category saved." : "Kategori dibuat. / Category created." };
  });
}
export async function deleteCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("category.manage");
    await admin.deleteCategory(u, str(fd, "id"));
    revalidatePath("/app/categories");
    return { ok: true, message: "Kategori dihapus. / Category deleted." };
  });
}

/* collections */
export async function saveCollectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "";
  const r = await run(async () => {
    const u = await authorize("category.manage");
    const id = str(fd, "id") || null;
    const row = await admin.saveCollection(u, id, {
      name: str(fd, "name"), slug: str(fd, "slug"), description: str(fd, "description"), is_published: bool(fd, "is_published"),
      sort: int(fd, "sort"), cover_media_id: str(fd, "cover_media_id"), product_ids: fd.getAll("product_ids").map(String),
    });
    revalidatePath("/app/collections");
    if (!id) dest = `/app/collections/${row.id}`;
    return { ok: true, message: "Koleksi disimpan. / Collection saved." };
  });
  if (dest) redirect(dest);
  return r;
}
export async function deleteCollectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const u = await authorize("category.manage");
    await admin.deleteCollection(u, str(fd, "id"));
  });
  if (r?.error) return r;
  redirect("/app/collections");
}

/* locations */
export async function saveWarehouseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("location.manage");
    await admin.saveWarehouse(u, str(fd, "id") || null, { code: str(fd, "code"), name: str(fd, "name"), address: str(fd, "address") });
    revalidatePath("/app/locations");
    return { ok: true, message: "Gudang disimpan. / Warehouse saved." };
  });
}
export async function saveLocationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("location.manage");
    const id = str(fd, "id") || null;
    await admin.saveLocation(u, id, { warehouse_id: str(fd, "warehouse_id"), code: str(fd, "code"), name: str(fd, "name"), is_active: id ? bool(fd, "is_active") : true });
    revalidatePath("/app/locations");
    return { ok: true, message: "Lokasi disimpan. / Location saved." };
  });
}
export async function deleteLocationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("location.manage");
    await admin.deleteLocation(u, str(fd, "id"));
    revalidatePath("/app/locations");
    return { ok: true, message: "Lokasi dihapus. / Location deleted." };
  });
}

/* users */
export async function inviteUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("users.manage");
    const { link } = await admin.inviteUser(u, { email: str(fd, "email"), name: str(fd, "name"), department: str(fd, "department"), roles: fd.getAll("roles").map(String), locale: str(fd, "locale") });
    revalidatePath("/app/users");
    return { ok: true, message: "Undangan dibuat dan dicatat di kotak keluar email. / Invitation created and written to the email outbox.", data: { link } };
  });
}
export async function resendInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("users.manage");
    const { link } = await admin.resendInvite(u, str(fd, "id"));
    return { ok: true, message: "Undangan baru dibuat. / New invitation created.", data: { link } };
  });
}
export async function updateUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("users.manage");
    await admin.updateUser(u, str(fd, "id"), { name: str(fd, "name"), department: str(fd, "department"), roles: fd.getAll("roles").map(String), status: str(fd, "status") });
    revalidatePath("/app/users");
    return { ok: true, message: "Pengguna diperbarui. / User updated." };
  });
}
export async function setRolePermissionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("users.manage");
    await admin.setRolePermission(u, str(fd, "role"), str(fd, "perm"), str(fd, "on") === "1");
    revalidatePath("/app/users/roles");
  });
}

/* settings */
export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("settings.manage");
    const values: Record<string, string | boolean> = {};
    for (const [k, def] of Object.entries(admin.SETTINGS_SCHEMA)) {
      if (def.type === "bool") values[k] = bool(fd, k);
      else if (fd.has(k)) values[k] = str(fd, k);
    }
    await admin.saveSettings(u, values);
    revalidatePath("/", "layout");
    return { ok: true, message: "Pengaturan disimpan. / Settings saved." };
  });
}

/* projects */
function projectInput(fd: FormData): ProjectInput {
  return { name: str(fd, "name"), code: str(fd, "code"), client_name: str(fd, "client_name"), event_name: str(fd, "event_name"), location: str(fd, "location"),
    start_date: str(fd, "start_date"), end_date: str(fd, "end_date"), department: str(fd, "department"), notes: str(fd, "notes"), status: str(fd, "status") || undefined, pic_user_id: str(fd, "pic_user_id") };
}
export async function saveProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "";
  const r = await run(async () => {
    const u = await authorize(["project.create", "project.manage"]);
    const id = str(fd, "id");
    if (id) { await updateProject(u, id, projectInput(fd)); revalidatePath(`/app/projects/${id}`); return { ok: true, message: "Proyek disimpan. / Project saved." }; }
    const p = await createProject(u, projectInput(fd));
    if (!p) throw new AppError("Gagal membuat proyek.");
    dest = `/app/projects/${p.id}`;
  });
  if (dest) redirect(dest);
  return r;
}
