import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { updateProductFrequentlyBought } from '@/lib/urvannApi';
import { getHubBySubstore } from '@/shared/constants/hubs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/frequently-bought/push-single
 * 
 * Push frequently bought together for a single SKU
 * 
 * Body:
 * - sku: string
 * - limit: number (default 6)
 * - manualSkusByHub: Record<string, string[]> (optional, hub -> SKUs mapping)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sku, limit = 6, manualSkusByHub = {} } = body;

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU is required' },
        { status: 400 }
      );
    }

    // Get SKU mapping
    const mappingCollection = await getCollection('skuProductMapping');
    const mapping = await mappingCollection.findOne({ sku });

    if (!mapping) {
      return NextResponse.json(
        { success: false, message: 'Product mapping not found for this SKU' },
        { status: 404 }
      );
    }

    const productId = mapping.product_id as string;
    // Get substores for hub mapping; exclude hubchange/test4
    const initialSkuSubstores = (mapping.substore as string[]) || [];
    const filteredSkuSubstores = initialSkuSubstores.filter(s => s !== 'hubchange' && s !== 'test4');
    if (filteredSkuSubstores.length === 0) {
      return NextResponse.json(
        { success: false, message: `SKU excluded: substore contains hubchange/test4` },
        { status: 400 }
      );
    }
    const skuSubstore = filteredSkuSubstores[0];
    const skuHub = skuSubstore ? getHubBySubstore(skuSubstore) : null;

    // Get all valid SKUs (strict validation: publish === "1" AND inventory > 0)
    const allMappings = await mappingCollection.find({
      substore: { $nin: ['hubchange', 'test4'] },
    }, {
      projection: { sku: 1, publish: 1, inventory: 1, substore: 1, _id: 0 }
    }).toArray();

    const validSKUs = new Set<string>();
    for (const m of allMappings) {
      const publishValue = m.publish;
      const inventoryValue = Number(m.inventory || 0);
      
      // Strict check: publish must be exactly "1" (string) or 1 (number), inventory must be > 0
      const publishStr = String(publishValue || "").trim();
      const isPublished = publishStr === "1";
      const isInStock = inventoryValue > 0;
      
      if (isPublished && isInStock) {
        validSKUs.add(m.sku as string);
      }
    }
    
    console.log(`[Push Single] Total mappings: ${allMappings.length}, Valid SKUs: ${validSKUs.size}`);

    // Find top paired products
    const frequentlyBoughtCollection = await getCollection('frequentlyBought');
    const transactions = await frequentlyBoughtCollection.find({
      channel: { $ne: 'admin' },
      'items.sku': sku,
      'items.1': { $exists: true },
      substore: { $nin: ['hubchange', 'test4'] },
    }, {
      projection: { items: 1 }
    }).toArray();

    // Count pairings
    const pairCounts = new Map<string, number>();

    for (const doc of transactions) {
      // Filter items: exclude price == 1 (explicit check to ensure price: 1 items are never included)
      const items = (doc.items as { sku: string; name: string; price?: number }[])
        .filter(item => item.price != null && item.price !== 1); // Explicitly exclude price: 1 and handle undefined/null
      
      let foundMainSku = false;
      for (const item of items) {
        if (item.sku === sku) {
          foundMainSku = true;
          break;
        }
      }

      if (foundMainSku) {
        for (const item of items) {
          if (item.sku !== sku) {
            pairCounts.set(item.sku, (pairCounts.get(item.sku) || 0) + 1);
          }
        }
      }
    }

    // NEW LOGIC: Get top SKUs based on this SKU's substore array instead of frequently bought together
    let autoPairedSkus: string[] = [];
    
    // Get this SKU's substore array (reuse from initial mapping if available, otherwise fetch)
    const skuSubstores = initialSkuSubstores.length > 0 
      ? initialSkuSubstores 
      : ((await mappingCollection.findOne(
          { sku: sku },
          { projection: { substore: 1, _id: 0 } }
        ))?.substore as string[]) || [];
    
    if (skuSubstores.length > 0) {
      // Query top SKUs directly from frequentlyBought collection for this SKU's substores
      const matchConditions: any = { 
        channel: { $ne: 'admin' },
        'items.price': { $ne: 1 },
        substore: { $nin: ['hubchange', 'test4'] },
      };
      
      if (skuSubstores.length === 1) {
        matchConditions.substore = skuSubstores[0];
      } else {
        matchConditions.substore = { $in: skuSubstores };
      }
      
      const topSkusByCount = await frequentlyBoughtCollection.aggregate([
        { $match: matchConditions },
        { $unwind: '$items' },
        { $match: { 'items.price': { $ne: 1 } } },
        {
          $group: {
            _id: '$items.sku',
            txnIds: { $addToSet: '$txn_id' },
          },
        },
        {
          $project: {
            sku: '$_id',
            orderCount: { $size: '$txnIds' },
            _id: 0,
          },
        },
        { $sort: { orderCount: -1 } },
        { $limit: limit * 2 }, // Get more candidates for filtering
      ]).toArray();
      
      // Get mappings for top SKUs to check availability
      const candidateSkus = topSkusByCount.map((item: any) => item.sku).filter((s: string) => s !== sku);
      if (candidateSkus.length > 0) {
        const topSkuMappings = await mappingCollection.find(
          { sku: { $in: candidateSkus } },
          { projection: { sku: 1, publish: 1, inventory: 1, _id: 0 } }
        ).toArray();
        
        // Create a map of orderCount for sorting
        const orderCountMap = new Map<string, number>();
        for (const item of topSkusByCount) {
          if (item.sku !== sku) {
            orderCountMap.set(item.sku, item.orderCount);
          }
        }
        
        // Filter for available products and sort by orderCount
        const availableTopSkus = topSkuMappings
          .filter((m: any) => 
            String(m.publish || '0').trim() === '1' &&
            (m.inventory || 0) > 0
          )
          .map((m: any) => ({
            sku: m.sku as string,
            orderCount: orderCountMap.get(m.sku as string) || 0,
          }))
          .sort((a, b) => b.orderCount - a.orderCount)
          .slice(0, limit)
          .map(item => item.sku);
        
        autoPairedSkus = availableTopSkus;
        console.log(`[Push Single] ${sku} (substores: ${skuSubstores.join(', ')}): Found ${autoPairedSkus.length} top SKUs based on substore array`);
      }
    }
    
    // Fallback to old logic if no substores or no top SKUs found
    if (autoPairedSkus.length === 0) {
      autoPairedSkus = Array.from(pairCounts.entries())
        .filter(([pairedSku]) => validSKUs.has(pairedSku))
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([pairedSku]) => pairedSku);
      console.log(`[Push Single] Auto-found paired SKUs (fallback): ${autoPairedSkus.length}`);
    }

    // Get manual SKUs for this SKU's hub only
    const hubManualSkus = skuHub && manualSkusByHub[skuHub] 
      ? (manualSkusByHub[skuHub] as string[])
          .filter((s: string) => s && s.trim() !== '')
          .map((s: string) => s.trim().toUpperCase())
      : [];
    
    if (skuHub && hubManualSkus.length > 0) {
      console.log(`[Push Single] ${sku} (substore: ${skuSubstore}, hub: ${skuHub}): Using ${hubManualSkus.length} manual SKU(s) from ${skuHub} hub: ${hubManualSkus.join(', ')}`);
    } else if (skuHub && Object.keys(manualSkusByHub).length > 0) {
      console.log(`[Push Single] ${sku} (substore: ${skuSubstore}, hub: ${skuHub}): No manual SKUs configured for ${skuHub} hub`);
    }

    // Merge logic for manual SKUs + auto-found SKUs
    let topPairedSkus: string[] = [];
    
    // Pre-fetch mappings for manual SKUs to validate them early
    let manualSkuMappings = new Map<string, { publish: any; inventory: any }>();
    if (hubManualSkus.length > 0) {
      const manualMappings = await mappingCollection.find(
        { sku: { $in: hubManualSkus } },
        { projection: { sku: 1, publish: 1, inventory: 1, _id: 0 } }
      ).toArray();
      
      for (const m of manualMappings) {
        manualSkuMappings.set(m.sku as string, {
          publish: m.publish,
          inventory: m.inventory,
        });
      }
      
      console.log(`[Push Single] Manual SKU mappings found: ${manualSkuMappings.size}/${hubManualSkus.length}`);
    }
    
    if (hubManualSkus.length > 0) {
      if (autoPairedSkus.length === 0) {
        // Case 1: No auto-found paired products, use manual SKUs (max 6) - but validate first
        const validatedManualSkus: string[] = [];
        const invalidManualSkus: string[] = [];
        
        for (const msku of hubManualSkus.slice(0, limit)) {
          const mapping = manualSkuMappings.get(msku);
          if (mapping) {
            const publishStr = String(mapping.publish || "").trim();
            const isPublished = publishStr === "1";
            const isInStock = Number(mapping.inventory || 0) > 0;
            
            if (isPublished && isInStock) {
              validatedManualSkus.push(msku);
            } else {
              const reason = !isPublished 
                ? `unpublished (publish: ${mapping.publish})` 
                : `out of stock (inventory: ${mapping.inventory})`;
              invalidManualSkus.push(`${msku} (${reason})`);
            }
          } else {
            invalidManualSkus.push(`${msku} (not found in mapping)`);
          }
        }
        
        topPairedSkus = validatedManualSkus;
        console.log(`[Push Single] Case 1: No auto-found products. Validated ${validatedManualSkus.length} manual SKUs, rejected ${invalidManualSkus.length}`);
        if (invalidManualSkus.length > 0) {
          console.log(`[Push Single] Case 1: Rejected manual SKUs - ${invalidManualSkus.join(', ')}`);
        }
      } else if (autoPairedSkus.length >= limit) {
        // Case 3: Found 6+ auto SKUs, use only auto-found ones
        topPairedSkus = autoPairedSkus.slice(0, limit);
        console.log(`[Push Single] Case 3: Found ${autoPairedSkus.length} auto SKUs (>= limit), using only auto-found`);
      } else {
        // Case 2: Found some (less than limit), merge with manual SKUs
        const needed = limit - autoPairedSkus.length;
        const manualToAdd: string[] = [];
        const invalidManualSkus: string[] = [];
        
        for (const msku of hubManualSkus) {
          if (manualToAdd.length >= needed) break;
          if (autoPairedSkus.includes(msku)) continue; // Skip duplicates
          
          const mapping = manualSkuMappings.get(msku);
          if (mapping) {
            const publishStr = String(mapping.publish || "").trim();
            const isPublished = publishStr === "1";
            const isInStock = Number(mapping.inventory || 0) > 0;
            
            if (isPublished && isInStock) {
              manualToAdd.push(msku);
            } else {
              const reason = !isPublished 
                ? `unpublished (publish: ${mapping.publish})` 
                : `out of stock (inventory: ${mapping.inventory})`;
              invalidManualSkus.push(`${msku} (${reason})`);
            }
          } else {
            invalidManualSkus.push(`${msku} (not found in mapping)`);
          }
        }
        
        topPairedSkus = [...autoPairedSkus, ...manualToAdd];
        console.log(`[Push Single] Case 2: Found ${autoPairedSkus.length} auto SKUs, adding ${manualToAdd.length} validated manual SKUs. Total: ${topPairedSkus.length}`);
        if (invalidManualSkus.length > 0) {
          console.log(`[Push Single] Case 2: Rejected manual SKUs - ${invalidManualSkus.join(', ')}`);
        }
      }
    } else {
      // No manual SKUs provided, use auto-found ones
      topPairedSkus = autoPairedSkus;
      console.log(`[Push Single] No manual SKUs provided, using ${topPairedSkus.length} auto-found SKUs`);
    }

    if (topPairedSkus.length === 0) {
      const hubInfo = skuHub ? ` (hub: ${skuHub})` : '';
      return NextResponse.json({
        success: false,
        message: `No valid paired products found and no valid manual SKUs${hubInfo}`,
      }, { status: 404 });
    }

    // Double-check: Verify publish status from mapping collection (no API calls)
    const finalValidSkus: string[] = [];
    const invalidSkus: Array<{ sku: string; reason: string; publish?: any; inventory?: any }> = [];
    
    // Fetch mapping data for all paired SKUs in one query
    const pairedMappings = await mappingCollection.find(
      { sku: { $in: topPairedSkus } },
      { projection: { sku: 1, publish: 1, inventory: 1, _id: 0 } }
    ).toArray();
    
    // Create a map for quick lookup
    const mappingMap = new Map<string, { publish: any; inventory: any }>();
    for (const m of pairedMappings) {
      mappingMap.set(m.sku as string, {
        publish: m.publish,
        inventory: m.inventory,
      });
    }
    
    // Validate each paired SKU using mapping data
    for (const pairedSku of topPairedSkus) {
      const mapping = mappingMap.get(pairedSku);
      
      if (!mapping) {
        invalidSkus.push({ sku: pairedSku, reason: 'Not found in mapping' });
        continue;
      }
      
      // Strict validation: publish must be exactly "1" (string) or 1 (number), inventory must be > 0
      const publishValue = mapping.publish;
      const inventoryValue = Number(mapping.inventory || 0);
      
      // Convert to string and trim for comparison - only "1" is valid
      const publishStr = String(publishValue || "").trim();
      const isPublished = publishStr === "1";
      const isInStock = inventoryValue > 0;
      
      // Log each SKU's validation details
      console.log(`[Push Single] Validating ${pairedSku}: publish="${publishValue}" (type: ${typeof publishValue}, str: "${publishStr}"), inventory=${inventoryValue}, isPublished=${isPublished}, isInStock=${isInStock}`);
      
      if (isPublished && isInStock) {
        finalValidSkus.push(pairedSku);
      } else {
        invalidSkus.push({
          sku: pairedSku,
          reason: !isPublished 
            ? `Unpublished (publish: ${publishValue}, expected: "1")` 
            : `Out of stock (inventory: ${inventoryValue})`,
          publish: publishValue,
          inventory: inventoryValue,
        });
      }
    }
    
    // Log validation details for debugging
    console.log(`[Push Single] SKU: ${sku}, Top paired: ${topPairedSkus.length}, Valid: ${finalValidSkus.length}, Invalid: ${invalidSkus.length}`);
    
    if (finalValidSkus.length > 0) {
      console.log(`[Push Single] ✅ SKUs being pushed (${finalValidSkus.length}):`, finalValidSkus.join(', '));
    }
    
    if (invalidSkus.length > 0) {
      console.log(`[Push Single] ❌ SKUs skipped (${invalidSkus.length}):`, invalidSkus.map(i => `${i.sku} (${i.reason})`).join(', '));
    }

    if (finalValidSkus.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid published and in-stock paired products found',
      }, { status: 404 });
    }

    // Push to Urvann API (only valid products)
    console.log(`[Push Single] 🚀 Pushing ${finalValidSkus.length} SKUs to product_id: ${productId}`);
    const pushResult = await updateProductFrequentlyBought(productId, finalValidSkus);
    
    if (!pushResult.success) {
      console.error(`[Push Single] ❌ Failed to push: ${pushResult.error}`);
      return NextResponse.json({
        success: false,
        message: `Failed to push updates to API: ${pushResult.error || 'Unknown error'}`,
        error: pushResult.error,
      }, { status: 500 });
    }
    
    console.log(`[Push Single] ✅ Successfully pushed SKUs:`, finalValidSkus.join(', '));

    const message = invalidSkus.length > 0
      ? `Successfully pushed ${finalValidSkus.length} valid products for SKU: ${sku}. ${invalidSkus.length} product(s) were skipped (unpublished/out of stock).`
      : `Successfully pushed ${finalValidSkus.length} products for SKU: ${sku}`;

    return NextResponse.json({
      success: true,
      message,
      pushedCount: finalValidSkus.length,
      skippedCount: invalidSkus.length,
      skippedSkus: invalidSkus.length > 0 ? invalidSkus : undefined,
      productId,
    });
  } catch (error: unknown) {
    console.error('Error pushing single SKU:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to push updates', error: errorMessage },
      { status: 500 }
    );
  }
}

