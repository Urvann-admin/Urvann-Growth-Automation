import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/frequently-bought/all-unique-skus
 * 
 * Get all unique SKUs from skuProductMapping collection
 * Only includes published products (publish == "1") with inventory > 0
 * OPTIMIZED: Uses cursor-based streaming, no unnecessary sorting
 */
export async function GET() {
  try {
    const mappingCollection = await getCollection('skuProductMapping');

    console.log('[All Unique SKUs API] Starting fetch...');
    const startTime = Date.now();

    // OPTIMIZATION: 
    // 1. Remove sort - it's expensive and not necessary (frontend can sort if needed)
    // 2. Use compound index hint for faster filtering
    // 3. Use projection to minimize data transfer
    // 4. Fetch without sort for maximum speed
    const uniqueSkus = await mappingCollection
      .find(
        {
          publish: '1',
          inventory: { $gt: 0 },
        },
        {
          projection: {
            sku: 1,
            name: 1,
            product_id: 1,
            _id: 0,
          },
          // Hint to use compound index for faster query
          hint: { publish: 1, inventory: 1 },
          // Increase batch size for faster fetching
          batchSize: 5000,
        }
      )
      .toArray();

    // Transform to ensure consistent format
    const result = uniqueSkus.map((doc) => ({
      sku: doc.sku as string,
      name: (doc.name as string) || '',
      product_id: doc.product_id as string,
    }));

    const elapsedTime = Date.now() - startTime;
    console.log(`[All Unique SKUs API] Found ${result.length} unique SKUs in ${elapsedTime}ms`);

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

