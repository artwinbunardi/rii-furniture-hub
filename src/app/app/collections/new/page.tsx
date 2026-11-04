import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { PageHeader, Card } from "@/components/ui/misc";
import { CollectionForm } from "../collection-form";
import { collectionFormData } from "../data";

export const metadata = { title: "New collection" };
export default async function NewCollectionPage() {
  const user = await requireUser("category.manage");
  const { t, lang } = await getT();
  const { products, media } = await collectionFormData(user.ctx);
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/collections" className="hover:text-ink">{t("nav_collections")}</Link>} title={lang === "en" ? "New collection" : "Koleksi baru"} />
      <Card className="max-w-3xl p-5"><CollectionForm lang={lang} selected={[]} products={products} media={media} /></Card>
    </>
  );
}
