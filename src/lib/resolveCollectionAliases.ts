import { CollectionMasterModel } from '@/models/collectionMaster';
import type { ObjectId } from 'mongodb';

/** Map listing `collectionIds` to StoreHippo collection aliases (deduped). */
export async function resolveCollectionAliases(
  collectionIds: (string | ObjectId)[] | undefined
): Promise<string[]> {
  if (!collectionIds?.length) return [];
  return CollectionMasterModel.findAliasesByIds(collectionIds);
}
