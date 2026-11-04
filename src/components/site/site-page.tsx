import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { getPublishedSite, findPage, baseSiteData, siteUser } from "@/lib/site/loader";
import type { PageType, SiteSnapshot } from "@/lib/site/types";
import { LinkPrefix } from "./link";
import type { PageData, SiteData } from "./types";
import type { CurrentUser } from "@/lib/auth/user";
import { SiteFrame } from "./frame";
import { RenderSections } from "./render";

import type { Loader } from "@/lib/site/page-loaders";

export async function SitePage({ type, slug, load, requireAuth, allowAnonymous, snapshot: override, prefix, banner }: {
  type: PageType; slug?: string; load?: Loader; requireAuth?: boolean; allowAnonymous?: boolean;
  /** Render this snapshot instead of the published one (draft / template / version previews). */
  snapshot?: SiteSnapshot; prefix?: string; banner?: React.ReactNode;
}) {
  const [published, user, lang] = await Promise.all([getPublishedSite(), getCurrentUser(), getLang()]);
  const snapshot = override ?? published.snapshot;
  const requireLogin = published.requireLogin;
  if (!user && !allowAnonymous && (requireLogin || requireAuth)) {
    const path = (await headers()).get("x-pathname") || "/";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  const page = findPage(snapshot, type, slug);
  if (!page) notFound();
  const base = await baseSiteData(user);
  const pageData = load ? await load(user, base) : { kind: "none" as const };
  if (pageData === null) notFound();
  const data: SiteData = {
    lang, user: siteUser(user), products: base.products, categories: base.categories, collections: base.collections,
    dates: base.dates, cartCount: base.cartCount, page: pageData, editor: false,
  };
  const body = (
    <SiteFrame cfg={snapshot} data={data}>
      <RenderSections sections={page.sections} theme={snapshot.theme} data={data} />
    </SiteFrame>
  );
  if (!prefix) return body;
  return <>{banner}<LinkPrefix prefix={prefix}>{body}</LinkPrefix></>;
}

export async function siteMetadata(type: PageType, slug?: string, fallbackTitle?: string) {
  const { snapshot } = await getPublishedSite();
  const page = findPage(snapshot, type, slug);
  return {
    title: page?.seo_title || fallbackTitle || page?.title || snapshot.seo.title || "RII Furniture Hub",
    description: page?.seo_description || snapshot.seo.description || undefined,
    icons: snapshot.theme.faviconUrl ? { icon: snapshot.theme.faviconUrl } : undefined,
  };
}
