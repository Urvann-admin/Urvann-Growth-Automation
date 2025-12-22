import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/frequently-bought/top-skus
 * 
 * Retrieves top 10 SKUs from skuProductMapping collection (published & in stock)
 * sorted by transaction count (unique txn_ids) from frequentlyBought collection.
 * OPTIMIZED: Gets top SKUs first, then filters by published/in-stock (much faster)
 */
export async function GET() {
  try {
    console.log('[Top SKUs API] Starting fetch...');
    const startTime = Date.now();

    const frequentlyBoughtCollection = await getCollection('frequentlyBought');
    const mappingCollection = await getCollection('skuProductMapping');

    // OPTIMIZATION: Get top SKUs by transaction count FIRST (no mapping filter)
    // This is much faster - we'll filter for published/in-stock later
    const topSkusByCount = await frequentlyBoughtCollection.aggregate([
      { $match: { channel: { $ne: 'admin' } } },
      { $unwind: '$items' },
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
      { $limit: 50 }, // Get top 50 candidates (we'll filter to top 10 published ones)
    ]).toArray();

    if (topSkusByCount.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // OPTIMIZATION: Fetch mapping details ONLY for top candidate SKUs (50 instead of 38k!)
    const candidateSkus = topSkusByCount.map((item: any) => item.sku);
    const candidateMappings = await mappingCollection.find(
      {
        sku: { $in: candidateSkus },
        publish: '1',
        inventory: { $gt: 0 },
      },
      {
        projection: { sku: 1, name: 1, _id: 0 },
      }
    ).toArray();

    // Create map for quick lookup
    const skuToNameMap = new Map<string, string>();
    const validSkuSet = new Set<string>();
    for (const m of candidateMappings) {
      const sku = m.sku as string;
      skuToNameMap.set(sku, (m.name as string) || '');
      validSkuSet.add(sku);
    }

    // Filter top SKUs to only include published & in-stock, then take top 10
    const topSkusWithNames = topSkusByCount
      .filter((item: any) => validSkuSet.has(item.sku))
      .slice(0, 10)
      .map((item: any) => ({
        sku: item.sku,
        orderCount: item.orderCount,
        name: skuToNameMap.get(item.sku) || '',
      }));

    const elapsedTime = Date.now() - startTime;
    console.log(`[Top SKUs API] Found ${topSkusWithNames.length} top SKUs in ${elapsedTime}ms`);

    return NextResponse.json({
      success: true,
      data: topSkusWithNames,
      total: topSkusWithNames.length,
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

