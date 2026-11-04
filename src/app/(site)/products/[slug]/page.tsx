import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { rows } = await getPool().query(`SELECT name, description FROM products WHERE slug = $1`, [slug]);
  const m = await siteMetadata("product");
  return { ...m, title: rows[0]?.name ?? m.title, description: rows[0]?.description?.slice(0, 160) ?? m.description };
}
export default async function Product({ params }: { params: Promise<{ slug: string }> }) {
  return <SitePage type="product" load={loaders.product((await params).slug)} />;
}
