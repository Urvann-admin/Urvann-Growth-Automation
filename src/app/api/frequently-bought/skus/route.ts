import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/frequently-bought/skus
 * 
 * Returns the count of unique SKUs from skuProductMapping collection 
 * where publish === "1" and inventory > 0.
 */
export async function GET() {
  try {
    // Get count of unique SKUs from mapping collection (only published & in stock)
    const mappingCollection = await getCollection('skuProductMapping');
    
    const count = await mappingCollection.countDocuments({
      publish: '1',
      inventory: { $gt: 0 },
    });

    console.log(`[SKUs API] Found ${count} unique SKUs from mapping`);

    return NextResponse.json({
      success: true,
      total: count,
    });
  } catch (error: unknown) {
    console.error('Error fetching unique SKU count:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch unique SKU count', error: errorMessage },
      { status: 500 }
    );
  }
}


