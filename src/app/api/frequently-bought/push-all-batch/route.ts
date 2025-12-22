import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { updateProductFrequentlyBought } from '@/lib/urvannApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes

interface BatchProgress {
  processed: number;
  total: number;
  current: { sku: string; name: string } | null;
  successes: string[];
  failures: Array<{ sku: string; productId: string; error: string }>;
  logs: string[];
}

/**
 * POST /api/frequently-bought/push-all-batch
 * 
 * Push frequently bought together for a batch of SKUs
 * OPTIMIZED: Uses batch queries, parallel API calls, and MongoDB aggregation
 * 
 * Body:
 * - startIndex: number
 * - batchSize: number
 * - allSkus: Array<{sku: string, name: string}>
 * - limit: number (default 6)
 * - manualSkus: string[] (optional, max 6 SKUs to manually add)
 * - allMappingsCache: Map<string, {product_id: string, publish: string, inventory: number}> (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startIndex = 0, batchSize = 50, allSkus = [], limit = 6, manualSkus = [], allMappingsCache } = body;
    
    // Log manual SKUs received
    if (manualSkus && Array.isArray(manualSkus) && manualSkus.length > 0) {
      console.log(`[Push All Batch] Received ${manualSkus.length} manual SKU(s): ${manualSkus.join(', ')}`);
    }

    const progress: BatchProgress = {
      processed: 0,
      total: batchSize,
      current: null,
      successes: [],
      failures: [],
      logs: [],
    };

    const mappingCollection = await getCollection('skuProductMapping');
    const frequentlyBoughtCollection = await getCollection('frequentlyBought');
    
    const endIndex = Math.min(startIndex + batchSize, allSkus.length);
    const batchSkus = allSkus.slice(startIndex, endIndex);
    const batchSkuList = batchSkus.map((s: any) => s.sku);
    
    // Build mappings map (use cache if provided, otherwise fetch)
    const skuToProductId = new Map<string, string>();
    const skuToMapping = new Map<string, { publish: string; inventory: number }>();
    
    if (allMappingsCache && typeof allMappingsCache === 'object') {
      // Use provided cache (convert from object to Map)
      for (const [sku, mapping] of Object.entries(allMappingsCache)) {
        skuToProductId.set(sku, (mapping as any).product_id);
        skuToMapping.set(sku, {
          publish: (mapping as any).publish || "0",
          inventory: (mapping as any).inventory || 0,
        });
      }
    } else {
      // Fetch mappings only for batch SKUs (fallback if cache not provided)
      const batchMappings = await mappingCollection.find(
        { sku: { $in: batchSkuList } },
        { projection: { sku: 1, product_id: 1, publish: 1, inventory: 1, _id: 0 } }
      ).toArray();

      for (const m of batchMappings) {
        const sku = m.sku as string;
        skuToProductId.set(sku, m.product_id as string);
        skuToMapping.set(sku, {
          publish: String(m.publish || "0").trim(),
          inventory: Number(m.inventory || 0),
        });
      }
    }

    // Filter valid SKUs (published and in stock)
    const validBatchSkus = batchSkus.filter(({ sku }: any) => {
      const mapping = skuToMapping.get(sku);
      return mapping && mapping.publish === "1" && mapping.inventory > 0;
    });

    if (validBatchSkus.length === 0) {
      progress.processed = batchSkus.length;
      progress.logs.push(`⊘ All ${batchSkus.length} SKUs in batch are unpublished or out of stock`);
      return NextResponse.json({
        success: true,
        progress,
        hasMore: endIndex < allSkus.length,
        nextIndex: endIndex,
      });
    }

    const validSkuList = validBatchSkus.map((s: any) => s.sku);

    // OPTIMIZATION 1: Batch query - Get pairings for ALL batch SKUs in ONE aggregation query
    console.log(`[Push All Batch] Fetching pairings for ${validSkuList.length} SKUs using aggregation...`);
    
    const pairingsAggregation = await frequentlyBoughtCollection.aggregate([
      // Match transactions that contain any of our batch SKUs and have at least 2 items
      {
        $match: {
          channel: { $ne: 'admin' },
          'items.sku': { $in: validSkuList },
          'items.1': { $exists: true }, // At least 2 items
        }
      },
      // Unwind items to work with individual products
      { $unwind: '$items' },
      // Filter out items with price = 1
      { $match: { 'items.price': { $ne: 1 } } },
      // Group by transaction to get all items per transaction
      {
        $group: {
          _id: '$txn_id',
          allItems: { $push: '$items.sku' },
          mainSkus: {
            $push: {
              $cond: [
                { $in: ['$items.sku', validSkuList] },
                '$items.sku',
                null
              ]
            }
          }
        }
      },
      // Filter out null values from mainSkus and filter transactions that have at least one batch SKU
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
      // Filter transactions that have at least one of our batch SKUs
      { $match: { mainSkus: { $ne: [] } } },
      // Unwind main SKUs to create pairs
      { $unwind: '$mainSkus' },
      // Unwind all items to create pairs
      { $unwind: '$allItems' },
      // Filter out pairs where mainSku == item (self-pairs)
      {
        $match: {
          $expr: { $ne: ['$mainSkus', '$allItems'] }
        }
      },
      // Group by (mainSku, pairedSku) to count occurrences
      {
        $group: {
          _id: {
            mainSku: '$mainSkus',
            pairedSku: '$allItems'
          },
          count: { $sum: 1 }
        }
      },
      // Group by mainSku to get top paired SKUs per main SKU
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
      // Sort pairs by count descending and limit
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
              limit * 3 // Get more candidates for filtering
            ]
          }
        }
      }
    ]).toArray();

    // Convert aggregation results to a map
    const skuPairingsMap = new Map<string, Array<{ pairedSku: string; count: number }>>();
    const allPairedSkusSet = new Set<string>();
    
    for (const result of pairingsAggregation) {
      skuPairingsMap.set(result.mainSku, result.topPairs);
      // Collect all unique paired SKUs for batch mapping lookup
      for (const pair of result.topPairs) {
        allPairedSkusSet.add(pair.pairedSku);
      }
    }

    // OPTIMIZATION 4: Batch fetch mappings for ALL paired SKUs at once (not per SKU)
    const allPairedSkusList = Array.from(allPairedSkusSet);
    
    // Also include manual SKUs in the fetch if provided
    const validManualSkus = (manualSkus as string[])
      .filter((s: string) => s && s.trim() !== '')
      .map((s: string) => s.trim().toUpperCase());
    
    if (validManualSkus.length > 0) {
      console.log(`[Push All Batch] Manual SKUs provided: ${validManualSkus.length} - ${validManualSkus.join(', ')}`);
    }
    
    // Combine paired SKUs + manual SKUs for single batch fetch
    const skusToFetch = [...allPairedSkusList];
    for (const msku of validManualSkus) {
      if (!skusToFetch.includes(msku)) {
        skusToFetch.push(msku);
      }
    }
    
    const pairedMappingsBatch = await mappingCollection.find(
      { sku: { $in: skusToFetch } },
      { projection: { sku: 1, publish: 1, inventory: 1, _id: 0 } }
    ).toArray();
    
    const globalPairedMappingMap = new Map<string, { publish: string; inventory: number }>();
    for (const m of pairedMappingsBatch) {
      globalPairedMappingMap.set(m.sku as string, {
        publish: String(m.publish || "0").trim(),
        inventory: Number(m.inventory || 0),
      });
    }

    // Check how many manual SKU mappings were found
    const manualMappingsFound = validManualSkus.filter(msku => globalPairedMappingMap.has(msku)).length;
    console.log(`[Push All Batch] Loaded mappings for ${globalPairedMappingMap.size} SKUs (${allPairedSkusList.length} auto + ${validManualSkus.length} manual, ${manualMappingsFound} manual mappings found)`);

    // OPTIMIZATION 2: Process SKUs in parallel with concurrent API calls
    const CONCURRENCY = 10; // Increased concurrency
    const API_CONCURRENCY = 5; // Process 5 API calls concurrently

    const processSku = async (sku: string, name: string) => {
      const productId = skuToProductId.get(sku);
      if (!productId) {
        return {
          sku,
          success: false,
          log: `⊘ ${sku}: No product mapping found`,
          productId: undefined,
          finalValidSkus: undefined,
        };
      }

      const mapping = skuToMapping.get(sku);
      if (!mapping || mapping.publish !== "1" || mapping.inventory <= 0) {
        return {
          sku,
          success: false,
          log: `⊘ ${sku}: Not published or out of stock, skipping`,
          productId,
          finalValidSkus: undefined,
        };
      }

      try {
        // Get pairings from aggregation result
        const pairs = skuPairingsMap.get(sku) || [];

        // Filter valid auto-found paired SKUs
        const autoPairedSkus: string[] = [];
        for (const pair of pairs) {
          if (autoPairedSkus.length >= limit) break;
          
          const pairedMapping = globalPairedMappingMap.get(pair.pairedSku);
          if (pairedMapping && pairedMapping.publish === "1" && pairedMapping.inventory > 0) {
            autoPairedSkus.push(pair.pairedSku);
          }
        }

        // Merge logic for manual SKUs + auto-found SKUs
        let finalValidSkus: string[] = [];
        const validManualSkus = (manualSkus as string[]).filter((s: string) => s && s.trim() !== '').map((s: string) => s.trim().toUpperCase());
        
        if (validManualSkus.length > 0) {
          if (autoPairedSkus.length === 0) {
            // Case 1: No auto-found paired products, use manual SKUs (max 6)
            // Validate manual SKUs
            const invalidManualSkus: string[] = [];
            
            for (const msku of validManualSkus.slice(0, limit)) {
              const mapping = globalPairedMappingMap.get(msku);
              
              if (mapping && mapping.publish === "1" && mapping.inventory > 0) {
                finalValidSkus.push(msku);
              } else {
                const reason = !mapping 
                  ? 'not found in mapping' 
                  : mapping.publish !== "1" 
                    ? `unpublished (publish: ${mapping.publish})` 
                    : `out of stock (inventory: ${mapping.inventory})`;
                invalidManualSkus.push(`${msku} (${reason})`);
              }
            }
            
            if (invalidManualSkus.length > 0) {
              console.log(`[Push All Batch] ${sku}: Manual SKUs rejected - ${invalidManualSkus.join(', ')}`);
            }
          } else if (autoPairedSkus.length >= limit) {
            // Case 3: Found 6+ auto SKUs, use only auto-found ones
            finalValidSkus = autoPairedSkus.slice(0, limit);
          } else {
            // Case 2: Found some (less than limit), merge with manual SKUs
            const needed = limit - autoPairedSkus.length;
            const manualToAdd: string[] = [];
            
            for (const msku of validManualSkus) {
              if (manualToAdd.length >= needed) break;
              if (autoPairedSkus.includes(msku)) continue; // Skip duplicates
              
              // Validate manual SKU
              const mapping = globalPairedMappingMap.get(msku);
              if (mapping && mapping.publish === "1" && mapping.inventory > 0) {
                manualToAdd.push(msku);
              }
            }
            
            finalValidSkus = [...autoPairedSkus, ...manualToAdd];
          }
        } else {
          // No manual SKUs provided, use auto-found ones
          finalValidSkus = autoPairedSkus;
        }

        if (finalValidSkus.length > 0) {
          const manualCount = validManualSkus.length > 0 ? finalValidSkus.length - autoPairedSkus.length : 0;
          let logMsg: string;
          
          if (manualCount > 0) {
            const manualSkusList = finalValidSkus.slice(autoPairedSkus.length);
            if (autoPairedSkus.length === 0) {
              // Case 1: Only manual SKUs
              logMsg = `✓ ${sku}: Pushing ${finalValidSkus.length} manual SKU${finalValidSkus.length > 1 ? 's' : ''} (${manualSkusList.join(', ')})`;
            } else {
              // Case 2: Mixed auto + manual
              logMsg = `✓ ${sku}: Pushing ${finalValidSkus.length} products (${autoPairedSkus.length} auto + ${manualCount} manual: ${manualSkusList.join(', ')})`;
            }
          } else {
            // Case 3 or no manual: Only auto-found
            logMsg = `✓ ${sku}: Pushing ${finalValidSkus.length} auto-found product${finalValidSkus.length > 1 ? 's' : ''}`;
          }
          
          return {
            sku,
            success: true,
            productId,
            finalValidSkus,
            log: logMsg,
          };
        } else {
          let failReason: string;
          
          if (validManualSkus.length > 0) {
            // Check if any manual SKUs were provided but all were invalid
            const invalidManualList = validManualSkus.filter(msku => {
              const mapping = globalPairedMappingMap.get(msku);
              return !mapping || mapping.publish !== "1" || mapping.inventory <= 0;
            });
            
            if (invalidManualList.length === validManualSkus.length) {
              // All manual SKUs were invalid
              failReason = `No auto-found products and all ${validManualSkus.length} manual SKU${validManualSkus.length > 1 ? 's' : ''} [${validManualSkus.join(', ')}] are invalid (unpublished/out of stock)`;
            } else {
              // Some were invalid
              failReason = `No auto-found products and manual SKU(s) [${invalidManualList.join(', ')}] are invalid`;
            }
          } else {
            failReason = 'No paired products found';
          }
          
          return {
            sku,
            success: false,
            log: `○ ${sku}: ${failReason}`,
            productId,
            finalValidSkus: undefined,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          sku,
          success: false,
          log: `✗ ${sku}: ${errorMessage}`,
          error: errorMessage,
          productId,
          finalValidSkus: undefined,
        };
      }
    };

    // Process SKUs in parallel chunks
    const processBatch = async (skus: Array<{ sku: string; name: string }>) => {
      const results: Array<{
        sku: string;
        success: boolean;
        log: string;
        error?: string;
        productId?: string;
        finalValidSkus?: string[];
      }> = [];

      // Process in chunks
      for (let i = 0; i < skus.length; i += CONCURRENCY) {
        const chunk = skus.slice(i, i + CONCURRENCY);
        
        if (chunk.length > 0) {
          progress.current = { sku: chunk[0].sku, name: chunk[0].name };
        }

        // Process chunk in parallel
        const chunkResults = await Promise.all(
          chunk.map(({ sku, name }) => 
            processSku(sku, name).catch((error) => ({
              sku,
              success: false,
              log: `✗ ${sku}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error: error instanceof Error ? error.message : 'Unknown error',
              productId: skuToProductId.get(sku),
              finalValidSkus: undefined,
            }))
          )
        );

        // OPTIMIZATION 2: Process API calls in parallel batches with rate limiting
        const apiCalls: Array<Promise<void>> = [];
        
        for (const result of chunkResults) {
          results.push(result);
          progress.processed++;
          
          if (result.success && result.finalValidSkus && result.productId) {
            // Add API call to queue
            apiCalls.push(
              updateProductFrequentlyBought(result.productId, result.finalValidSkus)
                .then(() => {
                  progress.successes.push(result.sku);
                  progress.logs.push(result.log);
                  console.log(`[Push All Batch] ✅ Pushed ${result.finalValidSkus!.length} SKUs for ${result.sku}`);
                })
                .catch((error) => {
                  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                  progress.failures.push({
                    sku: result.sku,
                    productId: result.productId!,
                    error: errorMsg,
                  });
                  progress.logs.push(`✗ ${result.sku}: API error - ${errorMsg}`);
                  console.error(`[Push All Batch] ❌ API error for ${result.sku}:`, errorMsg);
                })
            );
          } else {
            progress.logs.push(result.log);
            if (result.error && result.productId) {
              progress.failures.push({
                sku: result.sku,
                productId: result.productId,
                error: result.error,
              });
            }
          }
        }

        // Process API calls in parallel batches (respecting rate limits via urvannApi)
        // The urvannApi already has rate limiting built-in, so we can process concurrently
        if (apiCalls.length > 0) {
          // Process API calls in smaller concurrent batches
          for (let j = 0; j < apiCalls.length; j += API_CONCURRENCY) {
            const apiBatch = apiCalls.slice(j, j + API_CONCURRENCY);
            await Promise.all(apiBatch);
          }
        }
      }

      return results;
    };

    // Process all valid SKUs
    await processBatch(validBatchSkus);

    // Mark remaining invalid SKUs as processed
    const invalidCount = batchSkus.length - validBatchSkus.length;
    if (invalidCount > 0) {
      progress.processed += invalidCount;
      for (const { sku } of batchSkus) {
        if (!validBatchSkus.find((s: any) => s.sku === sku)) {
          progress.logs.push(`⊘ ${sku}: Not published or out of stock, skipping`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      progress,
      hasMore: endIndex < allSkus.length,
      nextIndex: endIndex,
    });
  } catch (error: unknown) {
    console.error('Error in push batch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to process batch', error: errorMessage },
      { status: 500 }
    );
  }
}
