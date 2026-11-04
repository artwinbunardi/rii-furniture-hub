import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("reservation");
export default async function ReservationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <SitePage type="reservation" requireAuth load={loaders.reservation(id, sp.submitted === "1")} />;
}
