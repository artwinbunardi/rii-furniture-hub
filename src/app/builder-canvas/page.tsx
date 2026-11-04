import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q1 } from "@/lib/db";
import { getDraft } from "@/lib/services/website";
import { baseSiteData, siteUser } from "@/lib/site/loader";
import { loaders } from "@/lib/site/page-loaders";
import { validateSnapshot } from "@/lib/site/validate";
import type { PageData, SiteData } from "@/components/site/types";
import { CanvasClient } from "@/components/builder/canvas-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editor canvas", robots: { index: false } };

/**
 * The visual editor's canvas, loaded in an iframe so responsive (mobile/tablet) preview uses real
 * viewport widths. It renders the editor's in-memory draft (sent via postMessage) with LIVE
 * inventory data, so product sections show the real catalog — the same components as the live site.
 */
export default async function BuilderCanvas() {
  const user = await requireUser("website.edit");
  const [lang, { snapshot }, base] = await Promise.all([getLang(), getDraft(user.ctx), baseSiteData(user)]);
  const firstProduct = base.products[0]?.slug;
  const firstCollection = base.collections[0]?.slug;
  const lastRes = await q1(user.ctx, `SELECT id FROM reservations WHERE requester_id = $1 AND NOT is_cart AND status <> 'draft' ORDER BY created_at DESC LIMIT 1`, [user.id]);
  const none: PageData = { kind: "none" };
  const safe = async (p: Promise<PageData | null>) => (await p.catch(() => null)) ?? none;
  const [catalog, product, collection, cart, reservations, reservation, account, login] = await Promise.all([
    safe(loaders.catalog({})(user, base)),
    firstProduct ? safe(loaders.product(firstProduct)(user, base)) : none,
    firstCollection ? safe(loaders.collection(firstCollection)(user, base)) : none,
    safe(loaders.cart()(user, base)),
    safe(loaders.reservations()(user, base)),
    lastRes ? safe(loaders.reservation(lastRes.id)(user, base)) : none,
    safe(loaders.account(lang)(user, base)),
    safe(loaders.login()(user, base)),
  ]);
  const pageData: Record<string, PageData> = { catalog, product, collection, cart, my_reservations: reservations, reservation, account, login };
  const data: Omit<SiteData, "page"> = {
    lang, user: siteUser(user), products: base.products, categories: base.categories, collections: base.collections,
    dates: base.dates, cartCount: base.cartCount, editor: true,
  };
  return <CanvasClient initial={validateSnapshot(snapshot)} data={data} pageData={pageData} />;
}
