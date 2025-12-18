import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { fetchAnalysis } from '@/lib/frequentlyBoughtApi';
import { batchUpdateFrequentlyBought } from '@/lib/urvannApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes

/**
 * POST /api/frequently-bought/push-updates
 * 
 * Push frequently bought together data to Urvann API
 * Uses skuProductMapping collection for product_id and to filter published products
 * 
 * Body:
 * - sku?: string (optional - push for specific SKU)
 * - limit?: number (number of paired products to push, default 10)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sku: specificSku, limit = 10 } = body;

    console.log(`Starting frequently bought together push${specificSku ? ` for SKU: ${specificSku}` : ' for all SKUs'}...`);

    // Get ALL SKU mappings from our collection with projection
    const mappingCollection = await getCollection('skuProductMapping');
    const allMappings = await mappingCollection.find({}, {
      projection: { sku: 1, product_id: 1, publish: 1, inventory: 1, _id: 0 }
    }).toArray();
    
    // Build maps in one pass for better performance
    const skuToProductId = new Map<string, string>();
    const validSKUs = new Set<string>();
    
    for (const m of allMappings) {
      const sku = m.sku as string;
      skuToProductId.set(sku, m.product_id as string);
      
      // Check if valid (published + in stock)
      if (m.publish === "1" && (m.inventory as number) > 0) {
        validSKUs.add(sku);
      }
    }
    
    console.log(`Loaded ${skuToProductId.size} SKU mappings, ${validSKUs.size} are valid (published + in stock)`);

    // Fetch frequently bought together data
    const analysisResult = await fetchAnalysis({
      page: 1,
      pageSize: specificSku ? 1 : 10000, // Get all if no specific SKU
      limit,
      search: specificSku || '',
    });

    if (!analysisResult.success || !analysisResult.data) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch frequently bought together data',
      }, { status: 400 });
    }

    const analysisData = analysisResult.data;
    
    if (analysisData.length === 0) {
      return NextResponse.json({
        success: true,
        message: specificSku 
          ? `No frequently bought together data found for SKU: ${specificSku}`
          : 'No frequently bought together data found',
        updated: 0,
      });
    }

    // Prepare updates - use mapping for both product_id and filtering paired products
    const updates: { sku: string; productId: string; frequentlyBoughtSkus: string[] }[] = [];
    const skippedSkus: string[] = [];
    
    for (const item of analysisData) {
      const productId = skuToProductId.get(item.sku);
      
      if (!productId) {
        console.warn(`No product_id found for SKU: ${item.sku}`);
        skippedSkus.push(item.sku);
        continue;
      }

      // Only include paired products that are valid (publish=1 AND inventory>0)
      const frequentlyBoughtSkus = item.topPaired
        .filter(paired => validSKUs.has(paired.sku))
        .map(paired => paired.sku);
      
      // Only add update if there are published paired products
      if (frequentlyBoughtSkus.length > 0) {
        updates.push({
          sku: item.sku,
          productId,
          frequentlyBoughtSkus,
        });
      } else {
        console.log(`SKU ${item.sku} has no published paired products, skipping`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid product_ids found for the SKUs. Please sync mappings first.',
        skippedSkus,
      }, { status: 400 });
    }

    console.log(`Pushing updates for ${updates.length} products... (${skippedSkus.length} skipped)`);

    // Batch update with progress tracking
    const results = await batchUpdateFrequentlyBought(
      updates,
      (completed, total, current) => {
        if (completed % 10 === 0 || completed === total) {
          console.log(`Progress: ${completed}/${total}${current ? ` (current: ${current})` : ''}`);
        }
      }
    );

    console.log(`Push completed. Successful: ${results.successful}, Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      message: `Push completed. Updated ${results.successful} products successfully.`,
      results: {
        successful: results.successful,
        failed: results.failed,
        total: updates.length,
        skipped: skippedSkus.length,
        errors: results.errors.slice(0, 20), // Show first 20 errors
      },
    });
  } catch (error: unknown) {
    console.error('Error pushing frequently bought together updates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to push updates', error: errorMessage },
      { status: 500 }
    );
  }
}
