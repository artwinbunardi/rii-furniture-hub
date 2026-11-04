import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("catalog");
export default async function Products({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <SitePage type="catalog" load={loaders.catalog(await searchParams)} />;
}
