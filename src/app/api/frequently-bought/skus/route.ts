import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/frequently-bought/skus
 * 
 * Retrieves all unique SKUs from the frequentlyBought collection
 * with their names and occurrence counts.
 * 
 * Query Parameters:
 * - search: (optional) Filter SKUs by name or SKU code
 * - limit: (optional) Limit the number of results (default: all)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 0;

    const collection = await getCollection('frequentlyBought');

    // Build the aggregation pipeline
    const pipeline: object[] = [
      // Filter out documents where channel is "admin"
      { $match: { channel: { $ne: 'admin' } } },
      // Unwind items array to work with individual products
      { $unwind: '$items' },
      // Filter out items with price == 1
      { $match: { 'items.price': { $ne: 1 } } },
      // Group by SKU to get unique SKUs with names and counts
      {
        $group: {
          _id: '$items.sku',
          name: { $first: '$items.name' },
          orderCount: { $sum: 1 }, // Number of orders containing this SKU
        },
      },
      // Project to clean output format
      {
        $project: {
          _id: 0,
          sku: '$_id',
          name: 1,
          orderCount: 1,
        },
      },
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { sku: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Sort by order count descending
    pipeline.push({ $sort: { orderCount: -1 } });

    // Apply limit if specified
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }

    const skus = await collection.aggregate(pipeline).toArray();

    return NextResponse.json({
      success: true,
      data: skus,
      total: skus.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching unique SKUs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch unique SKUs', error: errorMessage },
      { status: 500 }
    );
  }
}


