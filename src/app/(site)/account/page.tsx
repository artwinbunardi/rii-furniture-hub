import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
import { getLang } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("account");
export default async function AccountPage() { return <SitePage type="account" requireAuth load={loaders.account(await getLang())} />; }
