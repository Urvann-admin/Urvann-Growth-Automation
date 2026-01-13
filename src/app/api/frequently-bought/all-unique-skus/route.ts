import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/frequently-bought/all-unique-skus
 * 
 * Get all unique SKUs from skuProductMapping collection with transaction counts
 * Only includes published products (publish == "1") with inventory > 0
 * OPTIMIZED: Uses cursor-based streaming, no unnecessary sorting
 */
export async function GET() {
  try {
    const mappingCollection = await getCollection('skuProductMapping');
    const frequentlyBoughtCollection = await getCollection('frequentlyBought');

    console.log('[All Unique SKUs API] Starting fetch...');
    const startTime = Date.now();

    // OPTIMIZATION: 
    // 1. Remove sort - it's expensive and not necessary (frontend can sort if needed)
    // 2. Use projection to minimize data transfer
    // 3. Fetch without sort for maximum speed
    // 4. Ensure index exists for better performance (ignore if exists)
    try {
      await mappingCollection.createIndex({ publish: 1, inventory: 1 });
    } catch (e) {
      // Index might already exist, ignore error
    }
    
    const uniqueSkus = await mappingCollection
      .find(
        {
          publish: '1',
          inventory: { $gt: 0 },
          substore: { $nin: ['hubchange', 'test4'] },
        },
        {
          projection: {
            sku: 1,
            name: 1,
            product_id: 1,
            substore: 1,
            _id: 0,
          },
          // Increase batch size for faster fetching
          batchSize: 5000,
        }
      )
      .toArray();

    // Get all SKU codes for transaction count lookup
    const allSkuCodes = uniqueSkus.map((doc) => doc.sku as string);
    
    console.log(`[All Unique SKUs API] Fetching transaction counts for ${allSkuCodes.length} SKUs...`);
    const txCountStartTime = Date.now();
    
    // Get transaction counts from frequentlyBought collection
    const transactionCounts = await frequentlyBoughtCollection.aggregate([
      {
        $match: {
          channel: { $ne: 'admin' },
          'items.price': { $ne: 1 },
          substore: { $nin: ['hubchange', 'test4'] },
        },
      },
      { $unwind: '$items' },
      { $match: { 'items.price': { $ne: 1 } } },
      {
        $group: {
          _id: '$items.sku',
          txnIds: { $addToSet: '$txn_id' },
        },
      },
      {
        $project: {
          sku: '$_id',
          orderCount: { $size: '$txnIds' },
          _id: 0,
        },
      },
    ], { allowDiskUse: true }).toArray();
    
    // Create a map for quick lookup
    const skuToOrderCountMap = new Map<string, number>();
    for (const item of transactionCounts) {
      skuToOrderCountMap.set(item.sku as string, item.orderCount);
    }
    
    const txCountTime = Date.now() - txCountStartTime;
    console.log(`[All Unique SKUs API] Fetched transaction counts in ${txCountTime}ms`);

    // Transform to ensure consistent format with transaction counts
    const result = uniqueSkus.map((doc) => ({
      sku: doc.sku as string,
      name: (doc.name as string) || '',
      product_id: doc.product_id as string,
      substore: (doc.substore as string) || '',
      orderCount: skuToOrderCountMap.get(doc.sku as string) || 0, // Add transaction count
    }));

    const elapsedTime = Date.now() - startTime;
    console.log(`[All Unique SKUs API] Found ${result.length} unique SKUs with transaction counts in ${elapsedTime}ms`);

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching unique SKUs from mapping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch unique SKUs', error: errorMessage },
      { status: 500 }
    );
  }
}

