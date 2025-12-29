import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes for large export

/**
 * GET /api/frequently-bought/export-all
 * 
 * Exports ALL SKUs with their top 6 paired products for Excel export.
 * This endpoint processes all SKUs in the mapping collection and finds
 * their frequently bought together products.
 */
export async function GET() {
  try {
    console.log('[Export All] Starting export for all SKUs...');
    const startTime = Date.now();

    const mappingCollection = await getCollection('skuProductMapping');
    const frequentlyBoughtCollection = await getCollection('frequentlyBought');

    // Step 1: Get ALL SKUs from mapping (excluding hubchange/test4)
    const allMappings = await mappingCollection.find(
      {
        substore: { $nin: ['hubchange', 'test4'] },
      },
      {
        projection: { sku: 1, name: 1, _id: 0 },
      }
    ).toArray();

    const allSkus = allMappings.map(m => m.sku as string);
    const skuToNameMap = new Map<string, string>();
    for (const m of allMappings) {
      skuToNameMap.set(m.sku as string, (m.name as string) || '');
    }

    console.log(`[Export All] Found ${allSkus.length} SKUs to process`);

    // Step 2: Use aggregation to find pairings for ALL SKUs efficiently
    // This is much faster than processing each SKU individually
    const pairingsAggregation = await frequentlyBoughtCollection.aggregate([
      {
        $match: {
          channel: { $ne: 'admin' },
          'items.sku': { $in: allSkus },
          'items.1': { $exists: true }, // At least 2 items
          substore: { $nin: ['hubchange', 'test4'] },
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.price': { $ne: 1 } } }, // Exclude price: 1
      {
        $group: {
          _id: '$txn_id',
          allItems: { $push: '$items.sku' },
          mainSkus: {
            $push: {
              $cond: [
                { $in: ['$items.sku', allSkus] },
                '$items.sku',
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          allItems: 1,
          mainSkus: {
            $filter: {
              input: '$mainSkus',
              as: 'sku',
              cond: { $ne: ['$$sku', null] }
            }
          }
        }
      },
      { $match: { mainSkus: { $ne: [] } } },
      { $unwind: '$mainSkus' },
      { $unwind: '$allItems' },
      {
        $match: {
          $expr: { $ne: ['$mainSkus', '$allItems'] }
        }
      },
      {
        $group: {
          _id: {
            mainSku: '$mainSkus',
            pairedSku: '$allItems'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.mainSku',
          pairs: {
            $push: {
              pairedSku: '$_id.pairedSku',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          mainSku: '$_id',
          topPairs: {
            $slice: [
              {
                $sortArray: {
                  input: '$pairs',
                  sortBy: { count: -1 }
                }
              },
              6 // Top 6 only
            ]
          }
        }
      }
    ]).toArray();

    // Step 3: Build map of SKU -> top 6 paired SKUs
    const skuPairingsMap = new Map<string, Array<{ pairedSku: string; count: number }>>();
    for (const result of pairingsAggregation) {
      skuPairingsMap.set(result.mainSku, result.topPairs);
    }

    // Step 4: Get names for all paired SKUs
    const allPairedSkus = new Set<string>();
    for (const pairs of skuPairingsMap.values()) {
      for (const pair of pairs) {
        allPairedSkus.add(pair.pairedSku);
      }
    }

    const pairedMappings = await mappingCollection.find(
      {
        sku: { $in: Array.from(allPairedSkus) },
        substore: { $nin: ['hubchange', 'test4'] },
      },
      {
        projection: { sku: 1, name: 1, _id: 0 },
      }
    ).toArray();

    const pairedSkuToNameMap = new Map<string, string>();
    for (const m of pairedMappings) {
      pairedSkuToNameMap.set(m.sku as string, (m.name as string) || '');
    }

    // Step 5: Build final export data
    const exportData = allSkus.map(sku => {
      const pairs = skuPairingsMap.get(sku) || [];
      const topPaired = pairs.map(p => ({
        sku: p.pairedSku,
        name: pairedSkuToNameMap.get(p.pairedSku) || '',
        count: p.count,
      }));

      return {
        sku,
        name: skuToNameMap.get(sku) || '',
        topPaired,
      };
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`[Export All] Completed export for ${exportData.length} SKUs in ${elapsedTime}ms`);

    return NextResponse.json({
      success: true,
      data: exportData,
      total: exportData.length,
    });
  } catch (error: unknown) {
    console.error('[Export All] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to export data', error: errorMessage },
      { status: 500 }
    );
  }
}
