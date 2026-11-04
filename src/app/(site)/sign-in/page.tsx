import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("login");
export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <SitePage type="login" allowAnonymous load={loaders.login((await searchParams).next)} />;
}
