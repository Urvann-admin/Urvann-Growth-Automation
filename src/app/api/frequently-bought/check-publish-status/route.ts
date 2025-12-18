import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * POST /api/frequently-bought/check-publish-status
 * 
 * Checks which SKUs are published by looking up in skuProductMapping collection
 * Published = publish === 1 AND inventory_quantity > 0
 * 
 * Body:
 * - skus: string[] (array of SKUs to check)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skus } = body;

    if (!skus || !Array.isArray(skus)) {
      return NextResponse.json({
        success: false,
        message: 'skus array is required',
      }, { status: 400 });
    }

    // Get SKUs from mapping collection with projection for faster queries
    const mappingCollection = await getCollection('skuProductMapping');
    const mappings = await mappingCollection.find(
      { sku: { $in: skus } },
      { projection: { sku: 1, publish: 1, inventory: 1, _id: 0 } }
    ).toArray();
    
    // Create a Set of valid SKUs for O(1) lookup
    const validSkusSet = new Set<string>();
    for (const m of mappings) {
      if (m.publish === "1" && (m.inventory as number) > 0) {
        validSkusSet.add(m.sku as string);
      }
    }

    // Check each SKU - published = publish === "1" AND inventory > 0
    const results = skus.map((sku: string) => ({
      sku,
      isPublished: validSkusSet.has(sku),
    }));

    return NextResponse.json({
      success: true,
      data: results,
      publishedCount: results.filter(r => r.isPublished).length,
      unpublishedCount: results.filter(r => !r.isPublished).length,
    });
  } catch (error: unknown) {
    console.error('Error checking publish status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to check publish status', error: errorMessage },
      { status: 500 }
    );
  }
}
