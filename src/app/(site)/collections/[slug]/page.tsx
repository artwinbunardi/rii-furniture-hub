import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("collection");
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  return <SitePage type="collection" load={loaders.collection((await params).slug)} />;
}
