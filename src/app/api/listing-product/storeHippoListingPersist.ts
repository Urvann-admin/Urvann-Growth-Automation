import { ListingProductModel } from '@/models/listingProduct';
import type { ListingProduct } from '@/models/listingProduct';
import { mapListingProductToStoreHippoPayload } from '@/lib/listingProductStoreHippoPayload';
import { resolveCollectionAliases } from '@/lib/resolveCollectionAliases';
import { postMsProductCreate } from '@/lib/storeHippoProducts';

type ValidatedListing = Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * POST listing to StoreHippo first; on success insert MongoDB row with SH ids.
 * Does not run parent quantity / SKU master / image side effects (caller orchestrates).
 */
export async function persistListingProductAfterStoreHippo(
  data: ValidatedListing,
  creds: { baseUrl: string; accessKey: string }
): Promise<
  | { ok: true; created: ListingProduct & { _id: unknown } }
  | { ok: false; error: string }
> {
  const collectionAliases = await resolveCollectionAliases(data.collectionIds);
  const shBody = mapListingProductToStoreHippoPayload(data, { collectionAliases });
  const displayName = (data.finalName || data.plant || '').trim() || 'Product';
  const sh = await postMsProductCreate(shBody, { displayName, sku: data.sku }, creds);
  if (!sh.success) {
    return { ok: false, error: sh.error || 'StoreHippo product create failed' };
  }

  const created = await ListingProductModel.create({
    ...data,
    ...(sh.storeHippoId ? { storeHippoId: sh.storeHippoId, product_id: sh.storeHippoId } : {}),
    ...(sh.storeHippoAlias ? { storeHippoAlias: sh.storeHippoAlias } : {}),
  });

  return { ok: true, created: created as ListingProduct & { _id: unknown } };
}

/**
 * Insert a parent-type listing directly to MongoDB without posting to StoreHippo.
 * Used when the parent master was already pushed to SH; the listing row inherits SH ids from the parent.
 */
export async function persistParentListingFromParentMaster(
  data: ValidatedListing,
  shIds: { storeHippoId?: string; storeHippoAlias?: string }
): Promise<
  | { ok: true; created: ListingProduct & { _id: unknown } }
  | { ok: false; error: string }
> {
  try {
    const created = await ListingProductModel.create({
      ...data,
      ...(shIds.storeHippoId ? { storeHippoId: shIds.storeHippoId, product_id: shIds.storeHippoId } : {}),
      ...(shIds.storeHippoAlias ? { storeHippoAlias: shIds.storeHippoAlias } : {}),
    });
    return { ok: true, created: created as ListingProduct & { _id: unknown } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to insert listing' };
  }
}
