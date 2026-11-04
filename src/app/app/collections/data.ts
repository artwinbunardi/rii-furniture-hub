import { q } from "@/lib/db";
import type { DbCtx } from "@/lib/db";

export async function collectionFormData(ctx: DbCtx) {
  const [products, media] = await Promise.all([
    q(ctx, `SELECT p.id, p.sku, p.name, (SELECT m.storage_key FROM product_images pi JOIN media_assets m ON m.id = pi.media_id WHERE pi.product_id = p.id ORDER BY pi.sort LIMIT 1) AS key
      FROM products p WHERE p.is_active ORDER BY p.name`),
    q(ctx, `SELECT id, filename AS name, storage_key FROM media_assets WHERE mime_type LIKE 'image/%' ORDER BY created_at DESC LIMIT 300`),
  ]);
  return {
    products: products.map((p) => ({ id: p.id, sku: p.sku, name: p.name, img: p.key ? `/media/${p.key}` : null })),
    media: media.map((m) => ({ id: m.id, name: m.name, url: `/media/${m.storage_key}` })),
  };
}
