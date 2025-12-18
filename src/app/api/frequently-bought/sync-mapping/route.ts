import { NextResponse } from 'next/server';
import SkuProductMappingModel from '@/models/skuProductMapping';
import { fetchProductsForMapping } from '@/lib/urvannApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/frequently-bought/sync-mapping
 * 
 * Syncs SKU to product_id mapping from Urvann API
 */
export async function POST() {
  try {
    let start = 0;
    const limit = 100; // Increased batch size for faster sync
    let totalSynced = 0;
    let hasMore = true;

    console.log('Starting SKU to product_id mapping sync...');

    while (hasMore) {
      try {
        const { products, hasMore: moreProducts } = await fetchProductsForMapping(start, limit);
        
        if (products.length === 0) {
          break;
        }

        // Batch upsert mappings with publish and inventory status
        const operations = products.map(product => ({
          updateOne: {
            filter: { sku: product.sku },
            update: {
              $set: {
                product_id: product.product_id,
                price: product.price,
                publish: product.publish,
                inventory: product.inventory,
                updatedAt: new Date(),
              }
            },
            upsert: true,
          }
        }));

        if (operations.length > 0) {
          await SkuProductMappingModel.bulkWrite(operations, { ordered: false }); // Unordered for parallel writes
          totalSynced += products.length;
        }

        console.log(`Synced ${totalSynced} SKU mappings so far...`);

        hasMore = moreProducts;
        start += limit;

        // Reduced delay for faster sync while respecting rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error syncing batch starting at ${start}:`, error);
        // Continue with next batch
        start += limit;
      }
    }

    console.log(`SKU mapping sync completed. Total synced: ${totalSynced}`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${totalSynced} SKU to product_id mappings`,
      totalSynced,
    });
  } catch (error: unknown) {
    console.error('Error syncing SKU mappings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to sync SKU mappings', error: errorMessage },
      { status: 500 }
    );
  }
}
