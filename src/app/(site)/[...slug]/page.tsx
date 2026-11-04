import { SitePage, siteMetadata } from "@/components/site/site-page";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return siteMetadata("custom", slug.join("/"));
}
export default async function CustomPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <SitePage type="custom" slug={slug.join("/")} />;
}
