import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import type { ListingProduct, ListingSection } from '@/models/listingProduct';
import { ParentMasterModel, type ParentMaster } from '@/models/parentMaster';
import { toCanonicalParentSkuForPurchases } from '@/lib/skuGenerator';

const LISTING_PRODUCT_COLLECTION = 'listingProduct';

export type ListingSourcedParentOptionDTO = {
  listingId: string;
  listingSku: string;
  /** Hub on the source listing product document (used to filter the child picker). */
  listingHub: string;
  parent: ParentMaster;
};

/**
 * GET /api/listing-product/for-parent-picker
 * Options for the child listing "Parent" dropdown: each row is an existing **parent** listing
 * (`listingType: 'parent'`), first parent line merged with Parent Master for full row state.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') as ListingSection | null;
    const search = searchParams.get('search')?.trim() || '';
    const hubFilter = searchParams.get('hub')?.trim() || '';
    const limit = Math.min(2000, Math.max(1, parseInt(searchParams.get('limit') || '1000', 10)));

    const query: Record<string, unknown> = {
      'parentItems.0': { $exists: true },
      listingType: 'parent',
    };

    if (section && ['listing', 'revival', 'growth', 'consumer'].includes(section)) {
      query.section = section;
    }

    if (hubFilter) {
      query.hub = hubFilter;
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const s = search.trim();
      query.$or = [
        { plant: regex },
        { sku: regex },
        { finalName: regex },
        ...(s ? [{ 'parentItems.parentSku': s }] : []),
      ];
    }

    const collection = await getCollection(LISTING_PRODUCT_COLLECTION);
    const docs = await collection
      .find(query)
      .sort({ plant: 1 })
      .limit(limit)
      .toArray();

    const options: ListingSourcedParentOptionDTO[] = [];

    for (const raw of docs) {
      const doc = raw as unknown as ListingProduct;
      const listingId = doc._id != null ? String(doc._id) : '';
      if (!listingId) continue;
      const first = doc.parentItems?.[0];
      if (!first?.parentSku) continue;

      const hub = doc.hub ? String(doc.hub).trim() : undefined;
      const lt: 'parent' | 'child' = doc.listingType === 'parent' ? 'parent' : 'child';
      const canonical = toCanonicalParentSkuForPurchases(lt, hub, first.parentSku);
      if (!canonical) continue;

      const base = await ParentMasterModel.findBySku(canonical);
      if (!base) continue;

      const price = typeof doc.price === 'number' ? doc.price : Number(doc.price) || 0;
      const inv =
        typeof doc.inventory_quantity === 'number'
          ? doc.inventory_quantity
          : Number(doc.inventory_quantity) || 0;

      const merged = {
        ...base,
        plant: doc.plant?.trim() ? String(doc.plant).trim() : base.plant,
        sellingPrice: price,
        price,
        inventory_quantity: inv,
      } as ParentMaster;

      options.push({
        listingId,
        listingSku: doc.sku ? String(doc.sku).trim() : '',
        listingHub: hub ?? '',
        parent: merged,
      });
    }

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('[for-parent-picker] GET error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to load listing parents' },
      { status: 500 }
    );
  }
}
