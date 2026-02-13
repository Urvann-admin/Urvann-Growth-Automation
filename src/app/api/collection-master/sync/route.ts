import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CollectionMasterModel } from '@/models/collectionMaster';
import {
  fetchAllManualCollections,
  type StoreHippoCollectionItem,
} from '@/lib/storeHippoCollections';

function toCollectionMaster(item: StoreHippoCollectionItem): Omit<
  import('@/models/collectionMaster').CollectionMaster,
  '_id' | 'createdAt' | 'updatedAt'
> {
  return {
    storeHippoId: item._id,
    name: item.name ?? '',
    type: item.type ?? 'manual',
    alias: item.alias ?? '',
    filters: item.filters,
    images: item.images,
    SEO: item.SEO,
    publish: item.publish,
    metafields: item.metafields,
    _size: item._size,
    sort_order: item.sort_order,
    created_on: item.created_on,
    _created_by: item._created_by,
    entity_type: item.entity_type,
    description: item.description,
    default_sort_order: item.default_sort_order,
    facet_group: item.facet_group,
    substore: item.substore,
    updated_on: item.updated_on,
    _updated_by: item._updated_by,
  };
}

/**
 * POST /api/collection-master/sync
 * Fetches all manual collections from StoreHippo and upserts them into collectionMaster.
 * Uses STOREHIPPO_BASE_URL and URVANN_API_ACCESS_KEY from env.
 */
export async function POST() {
  try {
    if (!process.env.URVANN_API_ACCESS_KEY) {
      return NextResponse.json(
        { success: false, message: 'URVANN_API_ACCESS_KEY is not set in env' },
        { status: 500 }
      );
    }

    await connectDB();

    const items = await fetchAllManualCollections();
    let upserted = 0;

    for (const item of items) {
      const data = toCollectionMaster(item);
      await CollectionMasterModel.upsertByStoreHippoId(item._id, data);
      upserted++;
    }

    const total = await CollectionMasterModel.count();

    return NextResponse.json({
      success: true,
      message: `Synced ${upserted} manual collections into collectionMaster`,
      synced: upserted,
      totalInDb: total,
    });
  } catch (error) {
    console.error('[collection-master/sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
