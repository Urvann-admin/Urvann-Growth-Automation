import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProductCount from '@/models/ProductCount';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for background refresh

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Very conservative settings to avoid rate limits during background refresh
const REFRESH_CONCURRENCY = 3;  // Very low to avoid rate limits
const REFRESH_BATCH_DELAY = 300; // 300ms between batches

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Fetch single product count from Urvann API
async function fetchProductCount(category: string, substore: string): Promise<number> {
  // Use the raw alias directly - don't slugify as the alias from DB is already in correct format
  const categoryAlias = category;
  
  const filters = [
    { field: "categories", operator: "eq", value: categoryAlias },
    { field: "substore", operator: "eq", value: substore },
    { field: "publish", operator: "eq", value: "1" },
    // { field: "inventory_quantity", operator: "gt", value: 0 }
  ];
  
  // Paginate through all results to count them
  // Formula: Total = 500*n + x (where x < 500 is the last page count)
  let totalCount = 0;
  let start = 0;
  const limit = 500; // API max limit
  let pageNumber = 0;
  
  try {
    while (true) {
      pageNumber++;
      
      const queryParams = new URLSearchParams({
        fields: JSON.stringify({ sku: 1 }),
        limit: limit.toString(),
        start: start.toString(),
        filters: JSON.stringify(filters)
      });
      
      const apiUrl = `${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'access-key': ACCESS_KEY,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch count for ${categoryAlias}-${substore}: ${response.status}`);
        return totalCount;
      }
      
      const data = await response.json();
      const returnedCount = data.data?.length || 0;
      
      // Add to total
      totalCount += returnedCount;
      
      // If we got less than 500, this is the last page
      if (returnedCount < limit) {
        console.log(`✅ ${categoryAlias} - ${substore}: ${totalCount} products (${pageNumber} pages: ${Math.floor(totalCount/500)}×500 + ${totalCount%500})`);
        break;
      }
      
      // If we got exactly 500, there might be more - continue to next page
      start += limit;
      
      // Safety limit: max 20 pages (10,000 products)
      if (pageNumber >= 20) {
        console.log(`⚠️  ${categoryAlias} - ${substore}: Reached safety limit at ${totalCount} products`);
        break;
      }
    }
    
    return totalCount;
  } catch (error: any) {
    console.error(`❌ Error fetching count for ${category}-${substore}:`, error.message);
    return 0;
  }
}

// Refresh counts in database
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { categories, substores, mode = 'full' } = body;

    if (!categories || !substores) {
      return NextResponse.json(
        { success: false, message: 'Categories and substores are required' },
        { status: 400 }
      );
    }

    await connectDB();

    console.log('\n' + '='.repeat(80));
    console.log('🔄 BACKGROUND REFRESH STARTED');
    console.log('='.repeat(80));
    console.log(`📦 Categories: ${categories.length}`);
    console.log(`🏪 Substores: ${substores.length}`);
    console.log(`🎯 Total combinations: ${categories.length * substores.length}`);
    console.log(`⚡ Concurrency: ${REFRESH_CONCURRENCY} (very conservative)`);
    console.log(`📊 Mode: ${mode}`);
    console.log('='.repeat(80) + '\n');

    // Generate all combinations
    const combinations: Array<{ category: string; substore: string }> = [];
    for (const category of categories) {
      for (const substore of substores) {
        combinations.push({ category, substore });
      }
    }

    let processed = 0;
    let updated = 0;
    let failed = 0;

    // Process in small batches
    for (let i = 0; i < combinations.length; i += REFRESH_CONCURRENCY) {
      const batch = combinations.slice(i, i + REFRESH_CONCURRENCY);
      
      const batchPromises = batch.map(async ({ category, substore }) => {
        try {
          const count = await fetchProductCount(category, substore);
          
          // Update or create in database
          const savedDoc = await ProductCount.findOneAndUpdate(
            { category, substore },
            {
              category,
              substore,
              count,
              lastUpdated: new Date(),
              isStale: false,
            },
            { upsert: true, new: true }
          );
          
          // LOG: Confirm what was saved
          console.log(`💾 SAVED to DB: ${category} - ${substore} = ${count} (DB ID: ${savedDoc?._id})`);
          
          return { success: true, category, substore, count };
        } catch (error: any) {
          console.error(`Failed to update ${category}-${substore}:`, error.message);
          return { success: false, category, substore };
        }
      });
      
      const results = await Promise.all(batchPromises);
      
      results.forEach(result => {
        processed++;
        if (result.success) {
          updated++;
        } else {
          failed++;
        }
      });
      
      // Log progress every 10 batches
      if ((i / REFRESH_CONCURRENCY) % 10 === 0) {
        const progress = ((processed / combinations.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (processed / parseFloat(elapsed)).toFixed(1);
        const eta = ((combinations.length - processed) / parseFloat(rate)).toFixed(0);
        
        console.log(
          `📊 Progress: ${processed}/${combinations.length} (${progress}%) | ` +
          `⏱️  ${elapsed}s | 🚀 ${rate} req/s | ⏳ ETA: ${eta}s`
        );
      }
      
      // Add delay between batches
      if (i + REFRESH_CONCURRENCY < combinations.length) {
        await delay(REFRESH_BATCH_DELAY);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('✅ BACKGROUND REFRESH COMPLETED');
    console.log('='.repeat(80));
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success rate: ${((updated / processed) * 100).toFixed(1)}%`);
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({
      success: true,
      stats: {
        processed,
        updated,
        failed,
        timeElapsed: `${totalTime}s`,
        successRate: `${((updated / processed) * 100).toFixed(1)}%`,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in background refresh:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to refresh counts', error: error.message },
      { status: 500 }
    );
  }
}

// Trigger refresh for specific categories (quick refresh)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { categories, substores } = body;

    if (!categories || !substores) {
      return NextResponse.json(
        { success: false, message: 'Categories and substores are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Mark these combinations as stale for priority refresh
    const result = await ProductCount.updateMany(
      {
        category: { $in: categories },
        substore: { $in: substores },
      },
      {
        $set: { isStale: true }
      }
    );

    return NextResponse.json({
      success: true,
      message: `Marked ${result.modifiedCount} records for refresh`,
      modifiedCount: result.modifiedCount,
    });

  } catch (error: any) {
    console.error('Error marking records as stale:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark records', error: error.message },
      { status: 500 }
    );
  }
}

