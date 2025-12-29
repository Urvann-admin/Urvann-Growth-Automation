import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes for large export

/**
 * GET /api/frequently-bought/export-all
 * 
 * Exports ALL SKUs with their top 6 paired products for Excel export.
 * OPTIMIZED: Removed large $in filter, processes all transactions and filters in-memory.
 * 
 * Performance optimizations:
 * 1. No $in filter on 36k+ SKUs (MongoDB can't use indexes efficiently)
 * 2. Process all transactions, filter in-memory using Set (O(1) lookups)
 * 3. Simplified aggregation pipeline - fewer stages
 * 4. MongoDB can use indexes on channel and substore
 * 5. Uses allowDiskUse for large aggregations
 */
export async function GET() {
  try {
    console.log('[Export All] Starting optimized export for all SKUs...');
    const startTime = Date.now();

    const mappingCollection = await getCollection('skuProductMapping');
    const frequentlyBoughtCollection = await getCollection('frequentlyBought');

    // Step 1: Get ALL SKUs from mapping (excluding hubchange/test4) with publish/inventory
    const step1Start = Date.now();
    const allMappings = await mappingCollection.find(
      {
        substore: { $nin: ['hubchange', 'test4'] },
      },
      {
        projection: { sku: 1, name: 1, publish: 1, inventory: 1, _id: 0 },
        batchSize: 10000, // Optimize batch size
      }
    ).toArray();

    // Filter for available SKUs only (publish == "1" AND inventory > 0)
    const availableMappings = allMappings.filter(m => {
      const publish = String(m.publish || '0').trim();
      const inventory = Number(m.inventory || 0);
      return publish === '1' && inventory > 0;
    });

    const allSkus = availableMappings.map(m => m.sku as string);
    // Create Set for O(1) lookups - only available SKUs
    const availableSkusSet = new Set(allSkus);
    const skuToNameMap = new Map<string, string>();
    for (const m of availableMappings) {
      skuToNameMap.set(m.sku as string, (m.name as string) || '');
    }
    console.log(`[Export All] Step 1: Found ${allMappings.length} total SKUs, ${allSkus.length} available SKUs in ${Date.now() - step1Start}ms`);

    // Step 2: OPTIMIZED - Process ALL transactions (no $in filter on 36k+ items)
    // MongoDB can use indexes on channel and substore efficiently
    // We'll filter for valid SKUs in JavaScript after getting transaction data
    const step2Start = Date.now();
    
    // First, get all transactions with their items (filtered by channel/substore only)
    const transactions = await frequentlyBoughtCollection.aggregate([
      {
        $match: {
          channel: { $ne: 'admin' },
          'items.1': { $exists: true }, // At least 2 items
          substore: { $nin: ['hubchange', 'test4'] },
          // NOTE: Removed 'items.sku': { $in: allSkus } - this was the bottleneck!
        }
      },
      {
        $project: {
          items: {
            $filter: {
              input: '$items',
              as: 'item',
              cond: {
                $and: [
                  { $ne: ['$$item.price', null] },
                  { $ne: ['$$item.price', 1] } // Exclude price: 1
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          'items.1': { $exists: true } // Still need at least 2 items after filtering
        }
      }
    ], {
      allowDiskUse: true
    }).toArray();

    console.log(`[Export All] Step 2a: Fetched ${transactions.length} transactions in ${Date.now() - step2Start}ms`);

    // Step 2b: Process pairs in-memory (much faster than MongoDB aggregation for this)
    const step2bStart = Date.now();
    const skuPairingsMap = new Map<string, Map<string, number>>(); // mainSku -> Map<pairedSku, count>

    for (const txn of transactions) {
      // Handle both array of objects and array of strings
      const itemsArray = txn.items as any[];
      if (!itemsArray || !Array.isArray(itemsArray)) continue;
      
      // Extract SKUs from items (handle both {sku: "..."} and direct string)
      const items = itemsArray.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.sku) return item.sku as string;
        return null;
      }).filter((sku): sku is string => sku !== null && typeof sku === 'string');
      
      // Filter items to only include available SKUs (O(1) lookup with Set)
      const validItems = items.filter(sku => availableSkusSet.has(sku));
      
      // Skip if less than 2 available items
      if (validItems.length < 2) continue;

      // Create all pairs within this transaction
      for (let i = 0; i < validItems.length; i++) {
        const mainSku = validItems[i];
        
        // Initialize if needed
        if (!skuPairingsMap.has(mainSku)) {
          skuPairingsMap.set(mainSku, new Map());
        }
        const pairMap = skuPairingsMap.get(mainSku)!;

        for (let j = 0; j < validItems.length; j++) {
          if (i === j) continue; // Skip self-pairs
          
          const pairedSku = validItems[j];
          pairMap.set(pairedSku, (pairMap.get(pairedSku) || 0) + 1);
        }
      }
    }

    // Convert to top 6 pairs per SKU - only include available paired SKUs
    const skuTopPairsMap = new Map<string, Array<{ pairedSku: string; count: number }>>();
    for (const [mainSku, pairMap] of skuPairingsMap.entries()) {
      // Filter to only include available paired SKUs
      const topPairs = Array.from(pairMap.entries())
        .filter(([pairedSku]) => availableSkusSet.has(pairedSku)) // Only available paired SKUs
        .map(([pairedSku, count]) => ({ pairedSku, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      
      // Only add if there are pairs (and main SKU is available)
      if (topPairs.length > 0 && availableSkusSet.has(mainSku)) {
        skuTopPairsMap.set(mainSku, topPairs);
      }
    }

    console.log(`[Export All] Step 2b: Processed pairs in-memory in ${Date.now() - step2bStart}ms, found ${skuTopPairsMap.size} SKUs with pairings`);

    // Step 3: Get names for all paired SKUs (only fetch what we need)
    const step3Start = Date.now();
    const allPairedSkus = new Set<string>();
    for (const pairs of skuTopPairsMap.values()) {
      for (const pair of pairs) {
        allPairedSkus.add(pair.pairedSku);
      }
    }

    // Batch fetch paired SKU names - only for available SKUs
    const pairedSkuToNameMap = new Map<string, string>();
    if (allPairedSkus.size > 0) {
      const pairedMappings = await mappingCollection.find(
        {
          sku: { $in: Array.from(allPairedSkus) },
          substore: { $nin: ['hubchange', 'test4'] },
          publish: '1',
          inventory: { $gt: 0 },
        },
        {
          projection: { sku: 1, name: 1, _id: 0 },
          batchSize: 10000,
        }
      ).toArray();

      for (const m of pairedMappings) {
        const sku = m.sku as string;
        // Double-check it's in our available set
        if (availableSkusSet.has(sku)) {
          pairedSkuToNameMap.set(sku, (m.name as string) || '');
        }
      }
    }
    console.log(`[Export All] Step 3: Fetched ${pairedSkuToNameMap.size} available paired SKU names in ${Date.now() - step3Start}ms`);

    // Step 4: Build final export data - ALL available SKUs (even if they have no pairings)
    // IMPORTANT: Include ALL available SKUs, not just those with pairings
    const step4Start = Date.now();
    const exportData = allSkus.map(sku => {
      // Get pairings for this SKU (empty array if none)
      const pairs = skuTopPairsMap.get(sku) || [];
      
      // Filter paired products to only include available ones (double-check)
      const topPaired = pairs
        .filter(p => availableSkusSet.has(p.pairedSku)) // Ensure paired SKU is available
        .map(p => ({
          sku: p.pairedSku,
          name: pairedSkuToNameMap.get(p.pairedSku) || '',
          count: p.count,
        }));

      // Include this SKU in export (even if topPaired is empty)
      return {
        sku,
        name: skuToNameMap.get(sku) || '',
        topPaired, // Will be empty array [] if no pairings found
      };
    });
    
    const skusWithPairings = exportData.filter(item => item.topPaired.length > 0).length;
    const skusWithoutPairings = exportData.length - skusWithPairings;
    console.log(`[Export All] Step 4: Built export data for ${exportData.length} available SKUs (${skusWithPairings} with pairings, ${skusWithoutPairings} without pairings) in ${Date.now() - step4Start}ms`);

    const elapsedTime = Date.now() - startTime;
    console.log(`[Export All] ✅ Completed export for ${exportData.length} SKUs in ${elapsedTime}ms (${(elapsedTime / 1000).toFixed(2)}s)`);

    return NextResponse.json({
      success: true,
      data: exportData,
      total: exportData.length,
    });
  } catch (error: unknown) {
    console.error('[Export All] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Export All] Error stack:', errorStack);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to export data', 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}
