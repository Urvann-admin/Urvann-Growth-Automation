import { NextRequest, NextResponse } from 'next/server';
import { ListingProductModel } from '@/models/listingProduct';
import type {
  ListingProduct,
  ListingProductListingType,
  ListingSection,
  ListingStatus,
} from '@/models/listingProduct';
import { toCanonicalParentSkuForPurchases } from '@/lib/skuGenerator';
import { getSubstoresByHub } from '@/shared/constants/hubs';
import { withDerivedParentSkus } from '@/models/listingProduct';
import { syncListingProductToSkuMasterNew } from '@/models/skuMasterNew';
import { ImageCollectionModel } from '@/app/dashboard/listing/image/models/imageCollection';
import {
  clearParentIsListedIfNoParentListings,
  validateListingProductData,
  updateParentQuantitiesAfterCreation,
  generateFinalName,
} from './listingProductCore';

function escapeRegexFragment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const name = searchParams.get('name') || '';
    /** Listing product SKU or any parent line SKU (partial, case-insensitive). `parentSku` kept as alias. */
    const skuSearch =
      searchParams.get('sku')?.trim() || searchParams.get('parentSku')?.trim() || '';
    const section = searchParams.get('section') as ListingSection | null;
    const status = searchParams.get('status') as ListingStatus | null;
    const hub = searchParams.get('hub') || '';
    const category = searchParams.get('category') || '';
    const idsOnly = searchParams.get('idsOnly') === 'true';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const query: Record<string, unknown> = {};
    const andParts: Record<string, unknown>[] = [];

    const nameSearch = (name || search).trim();
    if (nameSearch) {
      const regex = new RegExp(nameSearch, 'i');
      andParts.push({
        $or: [
          { plant: regex },
          { otherNames: regex },
          { variety: regex },
          { type: regex },
          { finalName: regex },
        ],
      });
    }

    if (skuSearch) {
      const esc = escapeRegexFragment(skuSearch);
      andParts.push({
        $or: [
          { sku: { $regex: esc, $options: 'i' } },
          { 'parentItems.parentSku': { $regex: esc, $options: 'i' } },
        ],
      });
    }

    const listingTypeParam = searchParams.get('listingType')?.trim().toLowerCase();
    if (listingTypeParam === 'parent') {
      andParts.push({ listingType: 'parent' as const });
    } else if (listingTypeParam === 'child') {
      andParts.push({
        $or: [{ listingType: 'child' as const }, { listingType: { $exists: false } }],
      });
    }

    if (andParts.length === 1) {
      Object.assign(query, andParts[0]!);
    } else if (andParts.length > 1) {
      query.$and = andParts;
    }

    if (section) {
      query.section = section;
    }

    if (status) {
      query.status = status;
    }

    if (hub) {
      query.hub = hub;
    }

    if (category) {
      query.categories = category;
    }

    if (idsOnly) {
      const collection = await ListingProductModel.getCollection();
      const docs = await collection.find(query, { projection: { _id: 1 } }).toArray();
      const ids = docs.map((d) => String(d._id));
      return NextResponse.json({
        success: true,
        data: ids,
        total: ids.length,
      });
    }

    const result = await ListingProductModel.findWithPagination(
      query,
      page,
      limit,
      sortField,
      sortOrder as 1 | -1
    );

    return NextResponse.json({
      success: true,
      data: result.items.map((item) => withDerivedParentSkus(item as ListingProduct)),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching listing products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch listing products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle bulk create
    if (Array.isArray(body)) {
      const validatedItems: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>[] = [];
      const seenParentHubSection = new Set<string>();

      for (const item of body) {
        const validated = await validateListingProductData(item);
        if (!validated.success) {
          return NextResponse.json(
            { success: false, message: validated.message },
            { status: 400 }
          );
        }
        const data = validated.data!;
        if (data.listingType === 'parent' && data.hub && data.parentItems?.[0]) {
          const canon = toCanonicalParentSkuForPurchases(
            'parent',
            data.hub,
            data.parentItems[0].parentSku
          );
          const key = `${data.section}\0${data.hub}\0${canon}`;
          if (seenParentHubSection.has(key)) {
            return NextResponse.json(
              {
                success: false,
                message: `Duplicate parent listing for hub "${data.hub}" in this save batch.`,
              },
              { status: 400 }
            );
          }
          seenParentHubSection.add(key);
        }
        validatedItems.push(data);
      }
      
      const result = await ListingProductModel.createMany(validatedItems);

      // Update parent quantities after successful creation
      await updateParentQuantitiesAfterCreation(validatedItems);

      // Sync each to Inventory_Master.Sku_Master_New (best-effort; errors logged only)
      for (const item of validatedItems) {
        await syncListingProductToSkuMasterNew(item);
      }

      // Mark used images as listed in image collections (so they are hidden from listing form)
      const allImageUrls = validatedItems.flatMap((item) => (item.images || []).filter(Boolean));
      if (allImageUrls.length > 0) {
        ImageCollectionModel.markImagesAsListed(allImageUrls).catch((err) =>
          console.error('Failed to mark images as listed:', err)
        );
      }

      return NextResponse.json({
        success: true,
        message: `Created ${result.insertedCount} listing products`,
        insertedCount: result.insertedCount,
      });
    }
    
    // Single create
    const validated = await validateListingProductData(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.message },
        { status: 400 }
      );
    }

    const created = await ListingProductModel.create(validated.data!);

    // Update parent quantities after successful creation
    await updateParentQuantitiesAfterCreation([validated.data!]);

    // Sync to Inventory_Master.Sku_Master_New (best-effort; errors logged only)
    await syncListingProductToSkuMasterNew(created);

    // Mark used images as listed in image collections (so they are hidden from listing form)
    const imageUrls = (validated.data!.images || []).filter(Boolean);
    if (imageUrls.length > 0) {
      ImageCollectionModel.markImagesAsListed(imageUrls).catch((err) =>
        console.error('Failed to mark images as listed:', err)
      );
    }

    console.log('Listing product saved to DB:', created._id);
    return NextResponse.json({
      success: true,
      data: withDerivedParentSkus(created as ListingProduct),
    });
  } catch (error) {
    console.error('Error creating listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create listing product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id, ...updateData } = body;
    
    if (!_id) {
      return NextResponse.json(
        { success: false, message: '_id is required for update' },
        { status: 400 }
      );
    }

    // Get existing product for quantity comparison
    const existing = await ListingProductModel.findById(_id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    // Validate the update data (partial validation)
    const sanitized = await sanitizeUpdateData(updateData, existing as ListingProduct);
    if (!sanitized.success) {
      return NextResponse.json(
        { success: false, message: sanitized.message },
        { status: 400 }
      );
    }

    const result = await ListingProductModel.update(_id, sanitized.data!);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    // Sync to Inventory_Master.Sku_Master_New (refetch full document first)
    const updated = await ListingProductModel.findById(_id);
    if (updated) {
      await syncListingProductToSkuMasterNew(updated as ListingProduct);
    }

    return NextResponse.json({ success: true, message: 'Listing product updated successfully' });
  } catch (error) {
    console.error('Error updating listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update listing product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');
    
    // Bulk delete
    if (ids) {
      const idArray = ids.split(',').filter(Boolean);
      if (idArray.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No valid IDs provided' },
          { status: 400 }
        );
      }

      const toReconcile = new Set<string>();
      for (const oid of idArray) {
        const doc = await ListingProductModel.findById(oid);
        if (doc?.listingType === 'parent' && doc.parentItems?.[0]?.parentSku) {
          toReconcile.add(
            toCanonicalParentSkuForPurchases('parent', doc.hub, doc.parentItems[0].parentSku)
          );
        }
      }

      const result = await ListingProductModel.deleteMany(idArray);
      for (const sku of toReconcile) {
        await clearParentIsListedIfNoParentListings(sku);
      }
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} listing products`,
        deletedCount: result.deletedCount,
      });
    }
    
    // Single delete
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id is required for deletion' },
        { status: 400 }
      );
    }

    const existing = await ListingProductModel.findById(id);
    const result = await ListingProductModel.delete(id);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Listing product not found' },
        { status: 404 }
      );
    }

    if (existing?.listingType === 'parent' && existing.parentItems?.[0]?.parentSku) {
      await clearParentIsListedIfNoParentListings(
        toCanonicalParentSkuForPurchases('parent', existing.hub, existing.parentItems[0].parentSku)
      );
    }

    return NextResponse.json({ success: true, message: 'Listing product deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete listing product' },
      { status: 500 }
    );
  }
}

// Sanitize update data (allows partial updates)
async function sanitizeUpdateData(data: Record<string, unknown>, existing: ListingProduct): Promise<{
  success: boolean;
  message?: string;
  data?: Partial<Omit<ListingProduct, '_id' | 'createdAt'>>;
}> {
  const sanitized: Partial<Omit<ListingProduct, '_id' | 'createdAt'>> = {};

  // Most fields can be updated directly
  if (data.plant !== undefined) {
    sanitized.plant = String(data.plant).trim();
  }
  if (data.otherNames !== undefined) {
    sanitized.otherNames = String(data.otherNames).trim();
  }
  if (data.variety !== undefined) {
    sanitized.variety = String(data.variety).trim();
  }
  if (data.colour !== undefined) {
    sanitized.colour = String(data.colour).trim();
  }
  if (data.height !== undefined) {
    sanitized.height = typeof data.height === 'number' ? data.height : parseFloat(String(data.height)) || undefined;
  }
  if (data.mossStick !== undefined) {
    sanitized.mossStick = String(data.mossStick).trim();
  }
  if (data.size !== undefined) {
    sanitized.size = typeof data.size === 'number' ? data.size : parseFloat(String(data.size)) || undefined;
  }
  if (data.type !== undefined) {
    sanitized.type = String(data.type).trim();
  }
  if (data.description !== undefined) {
    sanitized.description = String(data.description).trim();
  }
  if (data.images !== undefined && Array.isArray(data.images)) {
    sanitized.images = (data.images as unknown[]).map((img) => String(img).trim()).filter(Boolean);
  }
  if (data.status !== undefined && ['draft', 'listed', 'published'].includes(data.status as string)) {
    sanitized.status = data.status as ListingStatus;
  }
  if (data.listingType !== undefined) {
    const lt = String(data.listingType).toLowerCase().trim();
    if (lt === 'parent' || lt === 'child') {
      sanitized.listingType = lt as ListingProductListingType;
    }
  }
  if (data.seller !== undefined) {
    sanitized.seller = String(data.seller).trim();
  }
  if (data.hub !== undefined) {
    const hub = String(data.hub).trim() || undefined;
    sanitized.hub = hub;
    sanitized.substores = hub ? getSubstoresByHub(hub) : [];
  }
  if (data.tags !== undefined && Array.isArray(data.tags)) {
    sanitized.tags = (data.tags as string[]).map((t) => String(t).trim()).filter(Boolean);
  }
  if (data.compare_at_price !== undefined) {
    sanitized.compare_at_price = typeof data.compare_at_price === 'number' ? data.compare_at_price : undefined;
  }
  if (data.tax !== undefined) {
    const taxNum = Number(data.tax);
    sanitized.tax = taxNum > 0 ? taxNum : undefined;
  }
  if (data.sort_order !== undefined) {
    sanitized.sort_order = typeof data.sort_order === 'number' ? data.sort_order : 3000;
  }
  if (data.redirects !== undefined && Array.isArray(data.redirects)) {
    sanitized.redirects = (data.redirects as string[]).map((r) => String(r).trim()).filter(Boolean);
  }
  if (data.features !== undefined && Array.isArray(data.features)) {
    sanitized.features = (data.features as string[]).map((f) => String(f).trim()).filter(Boolean);
  }
  if (data.publish_status !== undefined) {
    sanitized.publish_status = data.publish_status === 1 ? 1 : 0;
  }

  // Regenerate finalName if any relevant fields changed
  if (data.plant !== undefined || data.otherNames !== undefined || data.variety !== undefined || 
      data.colour !== undefined || data.size !== undefined || data.type !== undefined) {
    sanitized.finalName = generateFinalName({
      plant: sanitized.plant || existing.plant,
      otherNames: sanitized.otherNames !== undefined ? sanitized.otherNames : existing.otherNames,
      variety: sanitized.variety !== undefined ? sanitized.variety : existing.variety,
      colour: sanitized.colour !== undefined ? sanitized.colour : existing.colour,
      size: sanitized.size !== undefined ? sanitized.size : existing.size,
      type: sanitized.type !== undefined ? sanitized.type : existing.type,
    });
  }

  return { success: true, data: sanitized };
}