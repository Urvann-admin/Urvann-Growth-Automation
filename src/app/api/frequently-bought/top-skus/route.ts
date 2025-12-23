import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/frequently-bought/top-skus
 * 
 * Retrieves top 100 SKUs from skuProductMapping collection (all SKUs, no publish/inventory filter)
 * sorted by transaction count (unique txn_ids) from frequentlyBought collection.
 * Supports substore filtering and pagination (10 per page).
 * 
 * Query params:
 * - substore: string (optional) - filter by substore
 * - page: number (default 1) - page number
 * - pageSize: number (default 10) - items per page
 * 
 * Returns publish and inventory fields for frontend to display availability status.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const substoreParam = searchParams.get('substore') || '';
    const substoresParam = searchParams.get('substores') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    
    // Support both single substore and multiple substores (comma-separated)
    const substores = substoresParam 
      ? substoresParam.split(',').map(s => s.trim()).filter(Boolean)
      : (substoreParam ? [substoreParam] : []);
    
    console.log(`[Top SKUs API] Starting fetch... (substores: ${substores.length > 0 ? substores.join(',') : 'all'}, search: ${search || 'none'}, page: ${page}, pageSize: ${pageSize})`);
    const startTime = Date.now();

    const frequentlyBoughtCollection = await getCollection('frequentlyBought');
    const mappingCollection = await getCollection('skuProductMapping');

    // Build match conditions for frequentlyBought aggregation
    // IMPORTANT: Exclude price == 1 items
    const matchConditions: any = { 
      channel: { $ne: 'admin' },
      'items.price': { $ne: 1 }, // Exclude items with price: 1
      substore: { $nin: ['hubchange', 'test4'] }, // Exclude hubchange/test4
    };
    
    // Add substore filter if provided
    if (substores.length > 0) {
      const filtered = substores.filter(s => s !== 'hubchange' && s !== 'test4');
      if (filtered.length === 0) {
        return NextResponse.json({ success: true, data: [], total: 0 });
      }
      matchConditions.substore = filtered.length === 1 
        ? filtered[0] 
        : { $in: filtered, $nin: ['hubchange', 'test4'] };
    }

    // Get top SKUs by transaction count (no publish/inventory filter)
    // Get top 100 SKUs directly
    const topSkusByCount = await frequentlyBoughtCollection.aggregate([
      { $match: matchConditions },
      { $unwind: '$items' },
      // IMPORTANT: Double-check to exclude price == 1 items after unwind
      { $match: { 'items.price': { $ne: 1 } } },
      {
        $group: {
          _id: '$items.sku',
          txnIds: { $addToSet: '$txn_id' }, // Get unique txn_ids
        },
      },
      {
        $project: {
          sku: '$_id',
          orderCount: { $size: '$txnIds' }, // Count of unique txn_ids
          _id: 0,
        },
      },
      { $sort: { orderCount: -1 } }, // Sort by transaction count descending
      { $limit: pageSize >= 1000 ? 10000 : 200 }, // Higher limit for export (10000) or normal (200)
    ]).toArray();

    if (topSkusByCount.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Fetch mapping details for all top SKUs (no publish/inventory filter)
    const candidateSkus = topSkusByCount.map((item: any) => item.sku);
    
    // Build mapping filter - only filter by SKU list and substore if provided
    const mappingFilter: any = {
      sku: { $in: candidateSkus },
      substore: { $nin: ['hubchange', 'test4'] },
    };
    
    if (substores.length > 0) {
      const filtered = substores.filter(s => s !== 'hubchange' && s !== 'test4');
      if (filtered.length === 0) {
        return NextResponse.json({ success: true, data: [], total: 0 });
      }
      mappingFilter.substore = filtered.length === 1 
        ? filtered[0] 
        : { $in: filtered, $nin: ['hubchange', 'test4'] };
    }
    
    // Fetch all fields including publish and inventory for availability display
    const candidateMappings = await mappingCollection.find(
      mappingFilter,
      {
        projection: { sku: 1, name: 1, substore: 1, publish: 1, inventory: 1, _id: 0 },
      }
    ).toArray();

    // Create maps for quick lookup
    const skuToNameMap = new Map<string, string>();
    const skuToSubstoreMap = new Map<string, string | string[]>(); // Can be string or array
    const skuToPublishMap = new Map<string, string>();
    const skuToInventoryMap = new Map<string, number>();
    const foundSkuSet = new Set<string>();
    
    for (const m of candidateMappings) {
      const sku = m.sku as string;
      skuToNameMap.set(sku, (m.name as string) || '');
      // Handle substore as array or string (for backward compatibility)
      const substore = m.substore;
      skuToSubstoreMap.set(sku, Array.isArray(substore) ? substore : (substore as string) || '');
      skuToPublishMap.set(sku, (m.publish as string) || '0');
      skuToInventoryMap.set(sku, (m.inventory as number) ?? 0);
      foundSkuSet.add(sku);
    }

    // Map all top SKUs with their details (including publish/inventory for availability check)
    let allTopSkusWithNames = topSkusByCount
      .map((item: any) => ({
        sku: item.sku,
        orderCount: item.orderCount,
        name: skuToNameMap.get(item.sku) || '',
        substore: skuToSubstoreMap.get(item.sku) || '',
        publish: skuToPublishMap.get(item.sku) || '0',
        inventory: skuToInventoryMap.get(item.sku) ?? 0,
      }));

    // If search term is provided, ensure the searched SKU/name shows up even if not in the top list
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase().trim();

      // Try to find a direct SKU match from mapping (no publish/inventory filter; substore-respected)
      const directMatches = await mappingCollection.find(
        {
          sku: { $regex: new RegExp(searchLower, 'i') },
          substore: { $nin: ['hubchange', 'test4'] },
          ...(substores.length > 0
            ? {
                substore:
                  substores.length === 1
                    ? substores[0]
                    : { $in: substores, $nin: ['hubchange', 'test4'] },
              }
            : {}),
        },
        { projection: { sku: 1, name: 1, substore: 1, publish: 1, inventory: 1, _id: 0 } }
      ).toArray();

      const directMatchSkus = new Set(directMatches.map((m) => m.sku as string));

      // Add direct matches (with orderCount 0 if not already present)
      const directMatchItems = directMatches.map((m) => ({
        sku: m.sku as string,
        orderCount: skuToNameMap.has(m.sku as string) ? (allTopSkusWithNames.find(i => i.sku === m.sku)?.orderCount || 0) : 0,
        name: (m.name as string) || '',
        substore: Array.isArray(m.substore) ? m.substore : (m.substore as string) || '',
        publish: (m.publish as string) || '0',
        inventory: (m.inventory as number) ?? 0,
      }));

      const merged = [...allTopSkusWithNames];
      for (const item of directMatchItems) {
        if (!merged.find((i) => i.sku === item.sku)) {
          merged.push(item);
        }
      }
      allTopSkusWithNames = merged.filter((sku) => 
        sku.sku.toLowerCase().includes(searchLower) ||
        (sku.name && sku.name.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination (10 per page, or all if pageSize is large for export)
    const total = allTopSkusWithNames.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedSkus = allTopSkusWithNames.slice(startIndex, endIndex);

    const elapsedTime = Date.now() - startTime;
    console.log(`[Top SKUs API] Found ${total} top SKUs (page ${page}/${totalPages}, showing ${paginatedSkus.length}) in ${elapsedTime}ms`);

    return NextResponse.json({
      success: true,
      data: paginatedSkus,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error: unknown) {
    console.error('Error fetching top SKUs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch top SKUs', error: errorMessage },
      { status: 500 }
    );
  }
}

