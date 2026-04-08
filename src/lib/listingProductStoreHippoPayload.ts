import type { ListingProduct } from '@/models/listingProduct';

/** Validated listing row (no DB timestamps) — same shape as `validateListingProductData` output. */
export type ListingProductForShPayload = Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Build StoreHippo `ms.products` POST body from a validated listing product.
 * `alias` is omitted so StoreHippo can generate the URL slug; read back after create.
 */
export function mapListingProductToStoreHippoPayload(
  lp: ListingProductForShPayload,
  options: { collectionAliases: string[] }
): Record<string, unknown> {
  const name = (lp.finalName || lp.plant || '').trim() || 'Product';
  const publish = lp.publish_status === 1 ? '1' : '0';

  const body: Record<string, unknown> = {
    name,
    price: Number(lp.price) || 0,
    publish,
    categories: Array.isArray(lp.categories) ? lp.categories.map((c) => String(c).trim()).filter(Boolean) : [],
    images: (lp.images || [])
      .map((url) => ({ image: String(url ?? '').trim() }))
      .filter((x) => Boolean(x.image)),
    inventory_management: 'automatic',
    inventory_management_level: 'product',
    inventory_quantity: Math.max(0, Math.floor(Number(lp.inventory_quantity) || 0)),
    sort_order: typeof lp.sort_order === 'number' && Number.isFinite(lp.sort_order) ? lp.sort_order : 3000,
  };

  const sku = lp.sku ? String(lp.sku).trim() : '';
  if (sku) body.sku = sku;

  if (options.collectionAliases.length > 0) {
    body.collections = options.collectionAliases;
  }

  const desc = lp.description != null ? String(lp.description).trim() : '';
  if (desc) body.description = desc;

  if (typeof lp.compare_at_price === 'number' && Number.isFinite(lp.compare_at_price) && lp.compare_at_price >= 0) {
    body.compare_price = lp.compare_at_price;
  }

  if (lp.substores && lp.substores.length > 0) {
    body.substore = lp.substores.map((s) => String(s).trim()).filter(Boolean);
  }

  const seller = lp.seller != null ? String(lp.seller).trim() : '';
  if (seller) body.seller = seller;

  if (lp.SEO && (lp.SEO.title?.trim() || lp.SEO.description?.trim())) {
    body.SEO = {
      title: lp.SEO.title?.trim() ?? '',
      description: lp.SEO.description?.trim() ?? '',
    };
  }

  if (lp.features && lp.features.length > 0) {
    body.features = lp.features.map((f) => String(f).trim()).filter(Boolean);
  }

  const firstRedirect = lp.redirects?.find((r) => String(r).trim());
  if (firstRedirect) {
    body.metafields = { redirects: String(firstRedirect).trim() };
  }

  return body;
}
