import { SitePage, siteMetadata } from "@/components/site/site-page";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("contact");
export default function Contact() { return <SitePage type="contact" />; }
