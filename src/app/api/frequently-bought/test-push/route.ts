import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { updateProductFrequentlyBought } from '@/lib/urvannApi';

// API constants
const BASE_URL = 'https://www.urvann.com'; // Use main API for verification
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Helper function to fetch product
async function fetchProduct(productId: string) {
  const url = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'access-key': ACCESS_KEY,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/frequently-bought/test-push
 * 
 * Test endpoint to verify if the Urvann API can successfully push frequently bought together data
 * 
 * Body:
 * - sku: string (optional) - SKU to test with (e.g., "MUN0355P")
 * - productId: string (optional) - Product ID to test with. If not provided, will use SKU or first available product
 * - testSkus: string[] (optional) - SKUs to push. If not provided, will use sample SKUs
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sku: providedSku, productId: providedProductId, testSkus } = body;

    const mappingCollection = await getCollection('skuProductMapping');
    
    // Get a test product ID if not provided
    let testProductId = providedProductId;
    let testSku = '';
    
    if (!testProductId && providedSku) {
      // Look up product ID by SKU
      const skuMapping = await mappingCollection.findOne(
        { sku: providedSku.toUpperCase() },
        { projection: { sku: 1, product_id: 1, name: 1, publish: 1, inventory: 1, _id: 0 } }
      );

      if (!skuMapping) {
        return NextResponse.json({
          success: false,
          message: `SKU "${providedSku}" not found in mapping collection`,
        }, { status: 404 });
      }

      testProductId = skuMapping.product_id as string;
      testSku = skuMapping.sku as string;
      
      // Check if SKU is valid
      const publish = String(skuMapping.publish || "").trim();
      const inventory = Number(skuMapping.inventory || 0);
      
      if (publish !== "1" || inventory <= 0) {
        return NextResponse.json({
          success: false,
          message: `SKU "${providedSku}" is not published or out of stock (publish: ${publish}, inventory: ${inventory})`,
        }, { status: 400 });
      }
    } else if (!testProductId) {
      // Find a published, in-stock product to test with
      const testMapping = await mappingCollection.findOne({
        publish: '1',
        inventory: { $gt: 0 },
        price: { $ne: 1 },
      }, {
        projection: { sku: 1, product_id: 1, name: 1, _id: 0 }
      });

      if (!testMapping) {
        return NextResponse.json({
          success: false,
          message: 'No valid test product found in mapping collection',
        }, { status: 404 });
      }

      testProductId = testMapping.product_id as string;
      testSku = testMapping.sku as string;
    } else {
      // Get SKU for the provided product ID
      const mapping = await mappingCollection.findOne(
        { product_id: testProductId },
        { projection: { sku: 1, name: 1, _id: 0 } }
      );
      if (mapping) {
        testSku = mapping.sku as string;
      }
    }

    // Get test SKUs if not provided
    let skusToPush: string[] = testSkus || [];
    
    if (skusToPush.length === 0) {
      // Find 3-5 valid SKUs to use as test data
      const validMappings = await mappingCollection.find({
        publish: '1',
        inventory: { $gt: 0 },
        price: { $ne: 1 },
        sku: { $ne: testSku }, // Don't include the test product itself
      }, {
        projection: { sku: 1, _id: 0 },
        limit: 5,
      }).toArray();

      skusToPush = validMappings.map(m => m.sku as string);
      
      if (skusToPush.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No valid SKUs found for testing',
        }, { status: 404 });
      }
    }

    console.log(`[Test Push] Starting test for product_id: ${testProductId}, SKU: ${testSku}`);
    console.log(`[Test Push] SKUs to push:`, skusToPush);

    // Step 1: Fetch current state of the product
    console.log(`[Test Push] Step 1: Fetching current product state...`);
    let currentState: any = null;
    try {
      currentState = await fetchProduct(testProductId);
      console.log(`[Test Push] Current frequently_bought_together:`, currentState.frequently_bought_together || currentState.data?.frequently_bought_together || 'Not found');
    } catch (error) {
      console.warn(`[Test Push] Could not fetch current state:`, error);
    }

    // Step 2: Push the update
    console.log(`[Test Push] Step 2: Pushing update...`);
    const pushResult = await updateProductFrequentlyBought(testProductId, skusToPush);
    
    if (!pushResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to push update',
        error: pushResult.error,
        testProductId,
        testSku,
        skusToPush,
        currentState: currentState?.frequently_bought_together || currentState?.data?.frequently_bought_together || null,
      }, { status: 500 });
    }

    // Step 3: Wait a bit for the update to propagate
    console.log(`[Test Push] Step 3: Waiting for update to propagate...`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Verify the update by fetching the product again
    console.log(`[Test Push] Step 4: Verifying update...`);
    let verifiedState: any = null;
    let verificationSuccess = false;
    let actualSkus: string[] = [];
    
    try {
      verifiedState = await fetchProduct(testProductId);
      const fetchedSkus = verifiedState.frequently_bought_together || verifiedState.data?.frequently_bought_together;
      
      if (fetchedSkus && Array.isArray(fetchedSkus)) {
        actualSkus = fetchedSkus;
        const expectedSorted = [...skusToPush].sort();
        const actualSorted = [...actualSkus].sort();
        verificationSuccess = JSON.stringify(expectedSorted) === JSON.stringify(actualSorted);
        
        console.log(`[Test Push] Verification:`, {
          expected: expectedSorted,
          actual: actualSorted,
          match: verificationSuccess,
        });
      } else {
        console.warn(`[Test Push] Verification: frequently_bought_together field not found or not an array`);
      }
    } catch (error) {
      console.error(`[Test Push] Verification error:`, error);
    }

    // Step 5: Return comprehensive results
    const result = {
      success: pushResult.success && verificationSuccess,
      message: verificationSuccess 
        ? '✅ Test passed: Update was successfully pushed and verified'
        : pushResult.success 
          ? '⚠️ Update was pushed but verification failed - API may not be updating the field'
          : '❌ Update failed',
      testProductId,
      testSku,
      skusPushed: skusToPush,
      pushResult: {
        success: pushResult.success,
        error: pushResult.error,
      },
      verification: {
        success: verificationSuccess,
        expectedSkus: skusToPush,
        actualSkus: actualSkus,
        currentStateBefore: currentState?.frequently_bought_together || currentState?.data?.frequently_bought_together || null,
        currentStateAfter: verifiedState?.frequently_bought_together || verifiedState?.data?.frequently_bought_together || null,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`[Test Push] Test completed:`, result);

    return NextResponse.json(result, {
      status: verificationSuccess ? 200 : 500,
    });
  } catch (error: unknown) {
    console.error('[Test Push] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: 'Test failed with exception',
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/frequently-bought/test-push
 * 
 * Get information about the test endpoint
 */
export async function GET() {
  return NextResponse.json({
    message: 'Test Push API Endpoint',
    description: 'POST to this endpoint to test if the Urvann API can push frequently bought together data',
    usage: {
      method: 'POST',
      body: {
        productId: 'string (optional) - Product ID to test with',
        testSkus: 'string[] (optional) - SKUs to push for testing',
      },
      example: {
        sku: 'MUN0355P',
        testSkus: ['SKU1', 'SKU2', 'SKU3'],
      },
      example2: {
        productId: '507f1f77bcf86cd799439011',
        testSkus: ['SKU1', 'SKU2', 'SKU3'],
      },
    },
    notes: [
      'If productId is not provided, will use first available valid product',
      'If testSkus is not provided, will use first 5 available valid SKUs',
      'The endpoint will push the update and then verify it by fetching the product back',
    ],
  });
}

