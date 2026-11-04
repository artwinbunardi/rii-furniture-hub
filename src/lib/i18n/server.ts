import "server-only";
import { cookies } from "next/headers";
import { tr, type Lang, type DictKey } from "./dict";
import { getCurrentUser } from "../auth/session";

export const LANG_COOKIE = "rii_lang";

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (c === "en" || c === "id") return c;
  const u = await getCurrentUser();
  return u?.locale ?? "id";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: (k: DictKey | string) => tr(lang, k) };
}
