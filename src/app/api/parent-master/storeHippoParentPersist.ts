import { ParentMasterModel } from '@/models/parentMaster';
import type { ParentMaster } from '@/models/parentMaster';
import { mapParentMasterToStoreHippoPayload } from '@/lib/parentMasterStoreHippoPayload';
import { resolveCollectionAliases } from '@/lib/resolveCollectionAliases';
import { postMsProductCreate } from '@/lib/storeHippoProducts';

type ValidatedParent = Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * POST parent master to StoreHippo first; on success insert MongoDB row with SH ids.
 */
export async function createParentWithStoreHippo(
  data: ValidatedParent,
  creds: { baseUrl: string; accessKey: string }
): Promise<
  | { ok: true; created: ParentMaster & { _id: unknown } }
  | { ok: false; error: string }
> {
  const collectionAliases = await resolveCollectionAliases(data.collectionIds);
  const shBody = mapParentMasterToStoreHippoPayload(data, { collectionAliases });
  const displayName = (data.finalName || data.plant || '').trim() || 'Product';
  const sh = await postMsProductCreate(shBody, { displayName, sku: data.sku }, creds);
  if (!sh.success) {
    return { ok: false, error: sh.error || 'StoreHippo product create failed' };
  }

  const created = await ParentMasterModel.create({
    ...data,
    ...(sh.storeHippoId ? { storeHippoId: sh.storeHippoId, product_id: sh.storeHippoId } : {}),
    ...(sh.storeHippoAlias ? { storeHippoAlias: sh.storeHippoAlias } : {}),
  });

  return { ok: true, created: created as ParentMaster & { _id: unknown } };
}
