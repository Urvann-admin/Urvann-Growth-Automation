import type { ParentMaster } from '@/models/parentMaster';
import { parseFeatureTokens } from '@/models/productFeatureMaster';

export type ParentMasterForShPayload = Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Build StoreHippo `ms.products` POST body from a validated parent master row.
 * Used only for base `parent` products (not growing_product / consumable).
 */
export function mapParentMasterToStoreHippoPayload(
  p: ParentMasterForShPayload,
  options: { collectionAliases: string[] }
): Record<string, unknown> {
  const name = (p.finalName || p.plant || '').trim() || 'Product';
  const price =
    typeof p.listing_price === 'number' && Number.isFinite(p.listing_price)
      ? p.listing_price
      : Number(p.sellingPrice) || 0;

  const body: Record<string, unknown> = {
    name,
    price,
    publish: '0',
    categories: Array.isArray(p.categories) ? p.categories.map((c) => String(c).trim()).filter(Boolean) : [],
    images: (p.images || [])
      .map((url) => ({ image: String(url ?? '').trim() }))
      .filter((x) => Boolean(x.image)),
    inventory_management: 'automatic',
    inventory_management_level: 'product',
    inventory_quantity: Math.max(0, Math.floor(Number(p.inventory_quantity) || 0)),
    sort_order: 3000,
  };

  const sku = p.sku ? String(p.sku).trim() : '';
  if (sku) body.sku = sku;

  if (options.collectionAliases.length > 0) {
    body.collections = options.collectionAliases;
  }

  const desc = p.description != null ? String(p.description).trim() : '';
  if (desc) body.description = desc;

  if (
    typeof p.compare_at === 'number' &&
    Number.isFinite(p.compare_at) &&
    p.compare_at >= 0
  ) {
    body.compare_price = p.compare_at;
  }

  if (p.substores && p.substores.length > 0) {
    body.substore = p.substores.map((s) => String(s).trim()).filter(Boolean);
  }

  const seller = p.seller != null ? String(p.seller).trim() : '';
  if (seller) body.seller = seller;

  if (p.SEO && (p.SEO.title?.trim() || p.SEO.description?.trim())) {
    body.SEO = {
      title: p.SEO.title?.trim() ?? '',
      description: p.SEO.description?.trim() ?? '',
    };
  }

  const featureList = parseFeatureTokens(p.features);
  if (featureList.length > 0) {
    body.features = featureList;
  }

  const redirect = p.redirects != null ? String(p.redirects).trim() : '';
  if (redirect) {
    body.metafields = { redirects: redirect };
  }

  return body;
}
