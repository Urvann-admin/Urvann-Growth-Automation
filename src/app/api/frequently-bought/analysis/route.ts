import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/frequently-bought/analysis
 * 
 * Analyzes transaction data to find frequently bought together products.
 * Shows ALL pairings - publish status is checked separately when needed.
 * 
 * IMPORTANT: Items with price == 1 are ALWAYS excluded from analysis.
 * This filtering is applied in fetchTransactions() to ensure price: 1 SKUs
 * never appear in frequently bought together results.
 * 
 * Query Parameters:
 * - limit: Number of top paired products per SKU (default: 10)
 * - page: Page number for pagination (default: 1)
 * - pageSize: Number of SKUs per page (default: 10)
 * - sku: (optional) Filter for specific SKU
 * - search: (optional) Search by SKU or product name
 * - substores: (optional) Filter by substores (comma-separated)
 */
export async function GET(request: Request) {
  try {
    const params = parseQueryParams(request.url);
    
    // If searching for a specific SKU (exact match), check if it's published and in stock
    const searchSku = params.specificSku || (params.search ? params.search.trim() : '');
    if (searchSku) {
      const mappingCollection = await getCollection('skuProductMapping');
      
      // Check if search term exactly matches a SKU (case-insensitive)
      const mapping = await mappingCollection.findOne(
        { sku: { $regex: new RegExp(`^${searchSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { projection: { sku: 1, publish: 1, inventory: 1, name: 1, _id: 0 } }
      );
      
      // Only validate if it's an exact SKU match
      if (mapping) {
        // Check if SKU is unpublished or out of stock
        if (mapping.publish !== '1' || (mapping.inventory as number) <= 0) {
          return NextResponse.json({
            success: false,
            error: 'SKU_UNPUBLISHED',
            message: `SKU "${mapping.sku}" is unpublished or out of stock.`,
            sku: mapping.sku,
            name: mapping.name || '',
            publish: mapping.publish,
            inventory: mapping.inventory,
          }, { status: 400 });
        }
      }
    }
    
    const collection = await getCollection('frequentlyBought');
    
    // Get transactions and process pairs (no publish filter - show all pairings)
    const transactions = await fetchTransactions(collection, params.substores);
    const pairings = processPairs(transactions, params.limit);
    
    // Apply filters and pagination
    const results = applyFilters(pairings, params.specificSku, params.search);
    const paginatedData = paginate(results, params.page, params.pageSize);

    return NextResponse.json({
      success: true,
      data: paginatedData.data,
      pagination: paginatedData.pagination,
    });
  } catch (error: unknown) {
    console.error('Error analyzing frequently bought together:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to analyze frequently bought together', error: errorMessage },
      { status: 500 }
    );
  }
}

// --- Helper Functions ---

interface QueryParams {
  limit: number;
  page: number;
  pageSize: number;
  specificSku: string;
  search: string;
  substores: string[];
}

function parseQueryParams(url: string): QueryParams {
  const { searchParams } = new URL(url);
  const substoresParam = searchParams.get('substores') || '';
  
  return {
    limit: parseInt(searchParams.get('limit') || '10'),
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '1'),
    specificSku: searchParams.get('sku') || '',
    search: searchParams.get('search') || '',
    substores: substoresParam ? substoresParam.split(',').filter(s => s.trim()) : [],
  };
}

async function fetchTransactions(
  collection: ReturnType<typeof getCollection> extends Promise<infer T> ? T : never,
  substores: string[]
): Promise<{ items: { sku: string; name: string }[] }[]> {
  // Build match filter for initial aggregation
  // IMPORTANT: Exclude substores "hubchange" and "test4" - these must never be included
  const matchFilter: Record<string, unknown> = {
    channel: { $ne: 'admin' },
    'items.1': { $exists: true }, // At least 2 items
    substore: { $nin: ['hubchange', 'test4'] }, // Exclude hubchange and test4 substores
  };
  
  if (substores.length > 0) {
    // Filter out hubchange and test4 from user-provided substores
    const filteredSubstores = substores.filter(s => s !== 'hubchange' && s !== 'test4');
    if (filteredSubstores.length > 0) {
      matchFilter.substore = { $in: filteredSubstores, $nin: ['hubchange', 'test4'] };
    } else {
      // If all substores were filtered out, return empty result
      return [];
    }
  }

  // Use aggregation pipeline to properly filter out price: 1 items
  // This ensures price: 1 items are excluded at MongoDB level before processing
  const aggregationPipeline: any[] = [
    { $match: matchFilter },
    { $unwind: '$items' },
    // IMPORTANT: Filter out items with price = 1 - these must never be included in frequently bought analysis
    { $match: { 'items.price': { $ne: 1 } } },
    // Group back by transaction to get filtered items
    {
      $group: {
        _id: '$txn_id',
        items: { $push: { sku: '$items.sku', name: '$items.name' } }
      }
    },
    // Filter transactions that still have at least 2 items after filtering
    { $match: { 'items.1': { $exists: true } } }
  ];

  const results = await collection.aggregate(aggregationPipeline).toArray();

  // Transform results and deduplicate items by SKU within each transaction
  const txnItemsMap = new Map<string, { sku: string; name: string }[]>();
  
  for (const doc of results) {
    const txnId = doc._id as string;
    const items = doc.items as { sku: string; name: string }[];
    
    // Deduplicate items by SKU (keep first occurrence)
    const uniqueItems = Array.from(
      new Map(items.map(item => [item.sku, item])).values()
    );
    
    // Only include transactions with at least 2 unique items
    if (uniqueItems.length >= 2) {
      txnItemsMap.set(txnId, uniqueItems);
    }
  }

  return Array.from(txnItemsMap.values()).map(items => ({ items }));
}

interface SkuPairing {
  sku: string;
  name: string;
  totalPairings: number;
  topPaired: { sku: string; name: string; count: number }[];
}

function processPairs(
  transactions: { items: { sku: string; name: string }[] }[],
  limit: number
): SkuPairing[] {
  // Optimized: Use nested Map for O(1) lookups, avoid string concatenation
  const skuPairings = new Map<string, {
    name: string;
    totalPairings: number;
    pairMap: Map<string, { name: string; count: number }>;
  }>();

  // Count all pairs in a single pass
  for (const txn of transactions) {
    const items = txn.items;
    const len = items.length;
    
    for (let i = 0; i < len; i++) {
      const item1 = items[i];
      
      // Initialize sku1 data if not exists
      let sku1Data = skuPairings.get(item1.sku);
      if (!sku1Data) {
        sku1Data = {
          name: item1.name,
          totalPairings: 0,
          pairMap: new Map(),
        };
        skuPairings.set(item1.sku, sku1Data);
      }
      
      for (let j = 0; j < len; j++) {
        if (i === j) continue;
        
        const item2 = items[j];
        sku1Data.totalPairings++;
        
        const existing = sku1Data.pairMap.get(item2.sku);
        if (existing) {
          existing.count++;
        } else {
          sku1Data.pairMap.set(item2.sku, { name: item2.name, count: 1 });
        }
      }
    }
  }

  // Convert to array format with sorted topPaired
  const results: SkuPairing[] = [];
  for (const [sku, data] of skuPairings) {
    const topPaired = Array.from(data.pairMap.entries())
      .map(([pairedSku, pairedData]) => ({
        sku: pairedSku,
        name: pairedData.name,
        count: pairedData.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    results.push({
      sku,
      name: data.name,
      totalPairings: data.totalPairings,
      topPaired,
    });
  }

  return results;
}

function applyFilters(
  results: SkuPairing[],
  specificSku: string,
  search: string
): SkuPairing[] {
  let filtered = results;

  if (specificSku) {
    filtered = filtered.filter(r => r.sku === specificSku);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(r => 
      r.sku.toLowerCase().includes(searchLower) || 
      r.name.toLowerCase().includes(searchLower)
    );
  }

  // Sort by SKU
  filtered.sort((a, b) => a.sku.localeCompare(b.sku));

  return filtered;
}

function paginate(results: SkuPairing[], page: number, pageSize: number) {
  const totalSkus = results.length;
  const totalPages = Math.ceil(totalSkus / pageSize);
  const startIdx = (page - 1) * pageSize;
  const data = results.slice(startIdx, startIdx + pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalSkus,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}
