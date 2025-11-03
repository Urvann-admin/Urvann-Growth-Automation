import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProductCount from '@/models/ProductCount';

export const dynamic = 'force-dynamic';

// Get cached product counts from database (INSTANT!)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categories = searchParams.get('categories')?.split(',') || [];
    const substores = searchParams.get('substores')?.split(',') || [];

    if (categories.length === 0 || substores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Categories and substores are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch all matching counts from database
    const counts = await ProductCount.find({
      category: { $in: categories },
      substore: { $in: substores },
    }).lean();

    // Transform to nested object format
    const results: Record<string, Record<string, number>> = {};
    const lastUpdated: Record<string, Date> = {};
    let oldestUpdate: Date | null = null;
    let hasStaleData = false;

    // Initialize structure
    categories.forEach(category => {
      results[category] = {};
    });

    // Fill in counts
    counts.forEach((count: any) => {
      if (!results[count.category]) {
        results[count.category] = {};
      }
      results[count.category][count.substore] = count.count;
      
      if (!lastUpdated[count.category] || count.lastUpdated > lastUpdated[count.category]) {
        lastUpdated[count.category] = count.lastUpdated;
      }

      if (!oldestUpdate || count.lastUpdated < oldestUpdate) {
        oldestUpdate = count.lastUpdated;
      }

      if (count.isStale) {
        hasStaleData = true;
      }
    });

    // Fill in missing combinations with 0
    categories.forEach(category => {
      substores.forEach(substore => {
        if (results[category][substore] === undefined) {
          results[category][substore] = 0;
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        source: 'cache',
        oldestUpdate: oldestUpdate,
        hasStaleData,
        totalRecords: counts.length,
        expectedRecords: categories.length * substores.length,
      },
    });

  } catch (error: any) {
    console.error('Error fetching cached counts:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cached counts', error: error.message },
      { status: 500 }
    );
  }
}

// Get cache status and metadata
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { action } = body;

    if (action === 'status') {
      // Get cache statistics
      const totalRecords = await ProductCount.countDocuments();
      const staleRecords = await ProductCount.countDocuments({ isStale: true });
      
      const oldestRecord = await ProductCount.findOne()
        .sort({ lastUpdated: 1 })
        .select('lastUpdated')
        .lean() as any;

      const newestRecord = await ProductCount.findOne()
        .sort({ lastUpdated: -1 })
        .select('lastUpdated')
        .lean() as any;

      return NextResponse.json({
        success: true,
        stats: {
          totalRecords,
          staleRecords,
          oldestUpdate: oldestRecord?.lastUpdated || null,
          newestUpdate: newestRecord?.lastUpdated || null,
          cacheHealth: staleRecords === 0 ? 'healthy' : 'needs_update',
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error in cache status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get cache status', error: error.message },
      { status: 500 }
    );
  }
}

