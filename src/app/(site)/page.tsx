import { SitePage, siteMetadata } from "@/components/site/site-page";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("home");
export default function Home() { return <SitePage type="home" />; }
