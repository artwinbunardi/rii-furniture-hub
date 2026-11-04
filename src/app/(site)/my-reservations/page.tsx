import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("my_reservations");
export default function MyReservations() { return <SitePage type="my_reservations" requireAuth load={loaders.reservations()} />; }
