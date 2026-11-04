import { SitePage, siteMetadata } from "@/components/site/site-page";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("collections");
export default function Collections() { return <SitePage type="collections" />; }
