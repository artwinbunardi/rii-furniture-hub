import { SitePage, siteMetadata } from "@/components/site/site-page";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("about");
export default function About() { return <SitePage type="about" />; }
