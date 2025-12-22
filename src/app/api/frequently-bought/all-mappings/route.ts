import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/frequently-bought/all-mappings
 * 
 * Fetches all SKU mappings for caching
 * Returns a map of sku -> {product_id, publish, inventory}
 * OPTIMIZED: Uses efficient cursor streaming and Object.fromEntries for faster object creation
 */
export async function GET() {
  try {
    const mappingCollection = await getCollection('skuProductMapping');
    
    console.log('[All Mappings API] Fetching all mappings...');
    const startTime = Date.now();
    
    // OPTIMIZATION: Fetch with maximum batch size for fastest network transfer
    const mappings = await mappingCollection.find(
      {},
      {
        projection: { sku: 1, product_id: 1, publish: 1, inventory: 1, _id: 0 },
        batchSize: 20000, // Maximum batch size for fastest transfer
      }
    ).toArray();

    console.log(`[All Mappings API] Fetched ${mappings.length} documents, building object...`);
    const buildStartTime = Date.now();

    // OPTIMIZATION: Use Object.fromEntries with map - faster than loop for large datasets
    const mappingsMap = Object.fromEntries(
      mappings.map((m) => {
        const sku = m.sku as string;
        return [
          sku,
          {
            product_id: m.product_id as string,
            publish: String(m.publish || "0").trim(),
            inventory: Number(m.inventory || 0),
          }
        ];
      })
    );

    const buildTime = Date.now() - buildStartTime;

    const elapsedTime = Date.now() - startTime;
    const count = Object.keys(mappingsMap).length;
    console.log(`[All Mappings API] Built object with ${count} mappings in ${elapsedTime}ms (build: ${buildTime}ms)`);

    return NextResponse.json({
      success: true,
      data: mappingsMap,
      total: count,
    });
  } catch (error: unknown) {
    console.error('Error fetching all mappings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch mappings', error: errorMessage },
      { status: 500 }
    );
  }
}

