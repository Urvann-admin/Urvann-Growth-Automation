import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { fetchProductsForMapping } from '@/lib/urvannApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

interface BatchProgress {
  processed: number;
  total: number;
  currentBatch: number | null;
  successes: number;
  failures: number;
  logs: string[];
}

/**
 * POST /api/frequently-bought/sync-mapping-batch
 * 
 * Syncs SKU mappings in batches with progress tracking
 * Deletes all existing data first, then inserts new data
 * 
 * Body:
 * - sinceId: string (product_id to start from, '0' for first batch)
 * - batchSize: number (default 500)
 * - isFirstBatch: boolean (if true, deletes all existing data)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sinceId = '0', batchSize = 500, isFirstBatch = false } = body;

    const progress: BatchProgress = {
      processed: 0,
      total: batchSize,
      currentBatch: null,
      successes: 0,
      failures: 0,
      logs: [],
    };

    const mappingCollection = await getCollection('skuProductMapping');

    // Delete all existing data on first batch
    if (isFirstBatch) {
      progress.logs.push('🗑️ Clearing existing collection...');
      try {
        await mappingCollection.deleteMany({});
        progress.logs.push('✓ Collection cleared');
      } catch (dbError) {
        progress.logs.push(`✗ Error clearing collection: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    }

    try {
      progress.currentBatch = sinceId === '0' ? 1 : parseInt(sinceId) + 1;
      progress.logs.push(`Fetching batch (since_id: ${sinceId})...`);

      const { products, hasMore, lastId } = await fetchProductsForMapping(sinceId, batchSize);
      
      if (products.length === 0) {
        progress.logs.push('No more products to sync');
        return NextResponse.json({
          success: true,
          progress,
          hasMore: false,
          nextSinceId: sinceId,
        });
      }

      progress.logs.push(`Fetched ${products.length} products from API`);

      // Insert new documents (not upsert)
      const docs = products.map(product => ({
        sku: product.sku,
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        publish: product.publish,
        inventory: product.inventory,
        substore: product.substore || '',
        updatedAt: new Date(),
      }));

      if (docs.length > 0) {
        try {
          await mappingCollection.insertMany(docs, { ordered: false });
          progress.successes = products.length;
          progress.processed = products.length;
          progress.logs.push(`✓ Inserted ${products.length} products successfully`);
        } catch (dbError) {
          // Handle duplicate key errors gracefully (shouldn't happen with fresh insert, but just in case)
          const errorMsg = dbError instanceof Error ? dbError.message : 'Unknown error';
          if (errorMsg.includes('duplicate') || errorMsg.includes('E11000')) {
            progress.logs.push(`⚠ Some duplicates skipped: ${errorMsg}`);
            progress.successes = products.length; // Still count as success
          } else {
            progress.failures = products.length;
            progress.logs.push(`✗ Database error: ${errorMsg}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        progress,
        hasMore,
        nextSinceId: lastId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 406 errors are handled gracefully in fetchProductsForMapping
      if (errorMessage.includes('406')) {
        progress.logs.push('Reached API pagination limit (406) - sync complete');
        return NextResponse.json({
          success: true,
          progress,
          hasMore: false,
          nextSinceId: sinceId,
        });
      }
      
      progress.failures = batchSize;
      progress.logs.push(`✗ Error: ${errorMessage}`);
      
      return NextResponse.json({
        success: false,
        progress,
        hasMore: false,
        nextSinceId: sinceId,
        error: errorMessage,
      });
    }
  } catch (error: unknown) {
    console.error('Error in sync batch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to process sync batch', error: errorMessage },
      { status: 500 }
    );
  }
}

