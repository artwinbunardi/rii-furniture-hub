import { SitePage, siteMetadata } from "@/components/site/site-page";
import { loaders } from "@/lib/site/page-loaders";
export const dynamic = "force-dynamic";
export const generateMetadata = () => siteMetadata("cart");
export default function CartPage() { return <SitePage type="cart" requireAuth load={loaders.cart()} />; }
