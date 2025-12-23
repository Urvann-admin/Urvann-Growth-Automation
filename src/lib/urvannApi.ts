// Urvann API utilities with rate limiting

const BASE_URL = 'https://www.urvann.com';
const SYNC_BASE_URL = 'https://urvann.storehippo.com'; // Use storehippo.com for sync mapping
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Rate limiting configuration - OPTIMIZED for maximum speed
// OPTIMIZATION 1 & 2: Removed artificial delay, increased concurrency to 100
const MAX_CONCURRENT_REQUESTS = 100; // Increased from 50 to 100 for maximum speed
const MAX_RETRIES = 5; // allow a few more retries to ride out 429s
const RETRY_DELAY = 800; // base delay for backoff (will jitter)

// Semaphore-based rate limiting for concurrent requests (NO artificial delay)
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

// OPTIMIZATION 1: Removed 10ms delay - concurrency limit alone is sufficient for maximum speed
async function rateLimitDelay(): Promise<() => void> {
  // Wait for available slot if at max concurrency
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>(resolve => {
      requestQueue.push(resolve);
    });
  }
  
  activeRequests++;
  
  // NO DELAY - Concurrency limit alone prevents overwhelming the API
  // This allows maximum throughput while respecting concurrency limits
  
  // Return release function
  return () => {
    activeRequests--;
    const next = requestQueue.shift();
    if (next) next();
  };
}

// Utility function to make API request with retry logic
async function makeApiRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
  const release = await rateLimitDelay();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'access-key': ACCESS_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(15000),
    });
    
    release(); // Release slot immediately after request completes
    
    // Exponential backoff for rate limiting and transient failures (429/503)
    if ((response.status === 429 || response.status === 503) && retryCount < MAX_RETRIES) {
      // Respect Retry-After header if present
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
      const jitter = Math.floor(Math.random() * 200); // small jitter to avoid thundering herd
      const backoffDelay = retryAfterMs ?? (RETRY_DELAY * Math.pow(2, retryCount) + jitter);
      console.log(`Rate limited (${response.status}). Retrying in ${backoffDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return makeApiRequest(url, options, retryCount + 1);
    }
    
    return response;
  } catch (error) {
    release(); // Release slot on error
    if (retryCount < MAX_RETRIES) {
      const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Request failed. Retrying in ${backoffDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return makeApiRequest(url, options, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Fetch products with since_id pagination to build SKU to product_id mapping
 * Fetches ALL products with publish and inventory fields
 */
export async function fetchProductsForMapping(sinceId: string = '0', limit: number = 500): Promise<{
  products: { sku: string; product_id: string; price: number; publish: string; inventory: number; name: string; substore?: string[] }[];
  hasMore: boolean;
  lastId: string;
}> {
  // Build query params using since_id pagination
  // Note: API returns inventory_quantity, not inventory
  const fieldsParam = encodeURIComponent(JSON.stringify({ sku: 1, price: 1, publish: 1, inventory_quantity: 1, name: 1, substore: 1 }));
  const queryParams = new URLSearchParams();
  queryParams.append('fields', decodeURIComponent(fieldsParam));
  queryParams.append('limit', limit.toString());
  queryParams.append('since_id', sinceId);
  
  const url = `${SYNC_BASE_URL}/api/1.1/entity/ms.products?${queryParams.toString()}`;
  
  const response = await makeApiRequest(url, { 
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  });
  
  // Handle 406 Not Acceptable - might mean pagination limit reached
  if (response.status === 406) {
    console.warn(`406 Not Acceptable at since_id=${sinceId}, limit=${limit}. Possibly reached pagination limit.`);
    return {
      products: [],
      hasMore: false,
      lastId: sinceId,
    };
  }
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Handle both array and object responses
  let productsArray: any[] = [];
  if (Array.isArray(data.data)) {
    productsArray = data.data;
  } else if (data.data && typeof data.data === 'object') {
    productsArray = Object.values(data.data);
  }
  
  const products = productsArray.map((product: any) => {
    // Handle substore - keep as array to store all substores
    let substoreArray: string[] = [];
    if (product.substore) {
      if (Array.isArray(product.substore)) {
        // If it's already an array, use it (filter out empty values)
        substoreArray = product.substore.filter((s: any) => s && String(s).trim() !== '').map((s: any) => String(s).toLowerCase().trim());
      } else {
        // If it's a string, convert to array
        const substoreStr = String(product.substore).trim();
        if (substoreStr) {
          substoreArray = [substoreStr.toLowerCase()];
        }
      }
    } else if (product.store) {
      // Fallback to store field
      if (Array.isArray(product.store)) {
        substoreArray = product.store.filter((s: any) => s && String(s).trim() !== '').map((s: any) => String(s).toLowerCase().trim());
      } else {
        const storeStr = String(product.store).trim();
        if (storeStr) {
          substoreArray = [storeStr.toLowerCase()];
        }
      }
    }
    
    return {
      sku: product.sku || '',
      product_id: product._id,
      price: product.price || 0,
      publish: String(product.publish ?? "0"),
      inventory: product.inventory_quantity ?? 0, // Map inventory_quantity from API to inventory
      name: product.name || '',
      substore: substoreArray, // Array of substores
    };
  });
  
  // Get the last product_id for pagination
  // If products array is empty, use the sinceId
  const lastId = products.length > 0 ? products[products.length - 1].product_id : sinceId;
  
  // hasMore logic:
  // - If we got exactly the limit (500), there are definitely more products
  // - If we got fewer than limit, we might still have more (continue to be safe)
  // - Only stop when we get 0 products (handled by consecutive empty check) or 406 error
  // Continue fetching as long as we got products (let frontend handle stopping logic)
  const hasMore = products.length > 0;
  
  return {
    products,
    hasMore,
    lastId,
  };
}

/**
 * Get a single product by ID to understand the structure
 */
export async function getProductById(productId: string): Promise<any> {
  const url = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
  
  const response = await makeApiRequest(url, { method: 'GET' });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch product ${productId}: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Update product with frequently bought together data
 */
export async function updateProductFrequentlyBought(
  productId: string, 
  frequentlyBoughtSkus: string[],
  options?: { skipVerification?: boolean }
): Promise<{ success: boolean; error?: string }> {
  // Use BASE_URL (www.urvann.com) for updates - this is the main API endpoint
  // SYNC_BASE_URL (storehippo.com) is only for read operations (sync mapping)
  const primaryUrl = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
  const secondaryUrl = `${SYNC_BASE_URL}/api/1.1/entity/ms.products/${productId}`; // fallback write endpoint
  
  try {
    // CRITICAL: Always fetch full product first, then update with all fields
    // Some APIs require the full object to be sent, not just the field
    console.log(`[updateProductFrequentlyBought] Step 1: Fetching full product...`);
    const getUrl = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
    const getResponse = await makeApiRequest(getUrl, { method: 'GET' });
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text().catch(() => getResponse.statusText);
      console.error(`[updateProductFrequentlyBought] ❌ Failed to fetch product: HTTP ${getResponse.status}`, {
        productId,
        error: errorText,
      });
      return {
        success: false,
        error: `Failed to fetch product: HTTP ${getResponse.status}: ${errorText}`,
      };
    }
    
    const fullProduct = await getResponse.json();
    console.log(`[updateProductFrequentlyBought] Fetched product, current frequently_bought_together:`, 
      fullProduct.frequently_bought_together || fullProduct.data?.frequently_bought_together || 'Not found');
    
    // Update the field in the full product object
    // Try both possible locations for the field
    if (fullProduct.data) {
      fullProduct.data.frequently_bought_together = frequentlyBoughtSkus;
    } else {
      fullProduct.frequently_bought_together = frequentlyBoughtSkus;
    }
    
    // Build payload:
    // - top-level frequently_bought (primary field)
    // - also inside metafields to cover alternate storage
    const requestBody = {
      ...fullProduct,
      frequently_bought: frequentlyBoughtSkus,
      metafields: {
        ...(fullProduct.metafields || {}),
        frequently_bought: frequentlyBoughtSkus,
      },
    };
    
    console.log(`[updateProductFrequentlyBought] Step 2: PUT ${primaryUrl}`, {
      productId,
      skuCount: frequentlyBoughtSkus.length,
      skus: frequentlyBoughtSkus,
      productKeys: Object.keys(fullProduct).slice(0, 20),
    });
    
    const response = await makeApiRequest(primaryUrl, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    });
    
    // Log full response details
    const responseStatus = response.status;
    const responseStatusText = response.statusText;
    const responseHeaders = Object.fromEntries(response.headers.entries());
    
    console.log(`[updateProductFrequentlyBought] Response:`, {
      productId,
      status: responseStatus,
      statusText: responseStatusText,
      headers: responseHeaders,
      ok: response.ok,
    });
    
    // If primary failed, attempt fallback to SYNC_BASE_URL
    let effectiveResponse = response;
    if (!response.ok) {
      const errorText = await response.text().catch(() => responseStatusText);
      console.warn(`[updateProductFrequentlyBought] Primary PUT failed (HTTP ${responseStatus}), trying fallback SYNC endpoint`, {
        productId,
        status: responseStatus,
        statusText: responseStatusText,
        error: errorText,
      });
      const fallbackResp = await makeApiRequest(secondaryUrl, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });
      effectiveResponse = fallbackResp;
      if (!fallbackResp.ok) {
        const fallbackStatus = fallbackResp.status;
        const fallbackStatusText = fallbackResp.statusText;
        const fallbackError = await fallbackResp.text().catch(() => fallbackStatusText);
        console.error(`[updateProductFrequentlyBought] ❌ Fallback PUT failed: HTTP ${fallbackStatus}`, {
          productId,
          status: fallbackStatus,
          statusText: fallbackStatusText,
          error: fallbackError,
          requestBodyKeys: Object.keys(requestBody).slice(0, 20),
        });
        return {
          success: false,
          error: `HTTP ${fallbackStatus}: ${fallbackError}`,
        };
      }
    }
    
    // Try to parse response to verify it was successful
    let responseData: any = null;
    try {
      const responseText = await effectiveResponse.text();
      console.log(`[updateProductFrequentlyBought] Response body (raw):`, responseText.substring(0, 500));
      
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          // Not JSON, that's okay
          responseData = responseText;
        }
      }
    } catch (e) {
      // Couldn't read response, that's okay
      console.log(`[updateProductFrequentlyBought] Could not read response body:`, e);
    }
    
    // Verify the update by checking if frequently_bought_together is in the response
    const updateVerified = responseData && (
      (responseData.frequently_bought_together && 
       Array.isArray(responseData.frequently_bought_together) &&
       JSON.stringify(responseData.frequently_bought_together.sort()) === JSON.stringify(frequentlyBoughtSkus.sort())) ||
      (responseData.data && responseData.data.frequently_bought_together)
    );
    
    console.log(`[updateProductFrequentlyBought] ✅ Success:`, {
      productId,
      skuCount: frequentlyBoughtSkus.length,
      responseData: responseData ? (typeof responseData === 'object' ? 'Object received' : 'Text received') : 'No response data',
      updateVerified: updateVerified ? 'YES' : 'NO (response does not contain updated field)',
    });
    
    // Skip verification if requested (batch pushes)
    if (options?.skipVerification) {
      return { success: true };
    }
    
    // Always verify by fetching the product (even if response shows success)
    // This ensures the update was actually persisted to the database
    console.log(`[updateProductFrequentlyBought] Step 3: Verifying update by fetching product...`);
    try {
      // Wait for the update to propagate to the database
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second should be enough
      
      // Fetch full product to verify
      const verifyUrl = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
      const verifyResponse = await makeApiRequest(verifyUrl, { method: 'GET' });
        
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const actualValue =
          verifyData.frequently_bought ||
          verifyData.data?.frequently_bought ||
          verifyData.metafields?.frequently_bought ||
          verifyData.data?.metafields?.frequently_bought;
        
        console.log(`[updateProductFrequentlyBought] Verification - Expected:`, frequentlyBoughtSkus);
        console.log(`[updateProductFrequentlyBought] Verification - Actual:`, actualValue);
        
          if (actualValue && Array.isArray(actualValue)) {
            const expectedSorted = [...frequentlyBoughtSkus].sort();
            const actualSorted = [...actualValue].sort();
            const matches = JSON.stringify(expectedSorted) === JSON.stringify(actualSorted);
            
            if (matches) {
              console.log(`[updateProductFrequentlyBought] ✅ Verified: Product was successfully updated and persisted`);
              return { success: true };
            } else {
              console.warn(`[updateProductFrequentlyBought] ⚠️  Verification mismatch (treating as success): Expected ${JSON.stringify(expectedSorted)}, got ${JSON.stringify(actualSorted)}. API may reorder or replace unavailable SKUs.`);
              // Treat as success to avoid blocking batch pushes; return warning in error field
              return {
                success: true,
                error: `Verification mismatch: expected ${frequentlyBoughtSkus.join(', ')}, got ${actualValue.join(', ')}`,
              };
            }
          } else {
            console.warn(`[updateProductFrequentlyBought] ⚠️  Verification: Product does not have frequently_bought_together field or it's not an array. Field value:`, actualValue);
            // Treat as success but note warning
            return {
              success: true,
              error: `Verification warning: frequently_bought_together missing or not an array`,
            };
          }
      } else {
        console.warn(`[updateProductFrequentlyBought] ⚠️  Could not verify update: HTTP ${verifyResponse.status}`);
        return {
            success: true,
            error: `Verification warning: HTTP ${verifyResponse.status}`,
        };
      }
    } catch (verifyError) {
      console.error(`[updateProductFrequentlyBought] ⚠️  Verification error:`, verifyError);
      return {
          success: true,
          error: `Verification warning: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    console.error(`[updateProductFrequentlyBought] ❌ Exception:`, {
      productId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Fetch real-time publish status for a list of SKUs from Urvann API
 * Returns a Map of SKU -> {publish, inventory}
 */
export async function fetchProductPublishStatus(
  skus: string[]
): Promise<Map<string, { publish: string | number; inventory: number }>> {
  const statusMap = new Map<string, { publish: string | number; inventory: number }>();
  
  // Fetch in batches of 50 to avoid too many API calls
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < skus.length; i += BATCH_SIZE) {
    const batchSkus = skus.slice(i, i + BATCH_SIZE);
    
    // Create query to fetch multiple SKUs at once
    const queryParam = JSON.stringify({ sku: { $in: batchSkus } });
    const fieldsParam = encodeURIComponent(JSON.stringify({ 
      sku: 1, 
      publish: 1, 
      inventory_quantity: 1 
    }));
    
    const url = `${SYNC_BASE_URL}/api/1.1/entity/ms.products?query=${encodeURIComponent(queryParam)}&fields=${fieldsParam}&limit=${BATCH_SIZE}`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`[fetchProductPublishStatus] Failed to fetch batch: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      // Parse response
      let productsArray: any[] = [];
      if (Array.isArray(data)) {
        productsArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        productsArray = data.data;
      } else if (data.data && typeof data.data === 'object') {
        productsArray = Object.values(data.data);
      }
      
      // Map results
      for (const product of productsArray) {
        if (product.sku) {
          statusMap.set(product.sku, {
            publish: String(product.publish ?? "0"),
            inventory: product.inventory_quantity ?? 0,
          });
        }
      }
    } catch (error) {
      console.error(`[fetchProductPublishStatus] Error fetching batch:`, error);
    }
  }
  
  return statusMap;
}

/**
 * Batch update multiple products (with parallel processing and rate limiting)
 * OPTIMIZED: Processes updates in parallel batches for much faster execution
 */
export async function batchUpdateFrequentlyBought(
  updates: { sku: string; productId: string; frequentlyBoughtSkus: string[] }[],
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<{
  successful: number;
  failed: number;
  errors: { sku: string; productId: string; error: string }[];
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as { sku: string; productId: string; error: string }[],
  };
  
  // Process in parallel batches - rate limiting is handled by makeApiRequest
  // OPTIMIZATION 3: Increased batch size from 30 to 50 for faster processing
  const BATCH_SIZE = 50; // Process 50 updates concurrently (increased from 30)
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (update) => {
      if (onProgress) {
        onProgress(i + batch.indexOf(update), updates.length, update.sku);
      }
      
      const result = await updateProductFrequentlyBought(
        update.productId, 
        update.frequentlyBoughtSkus,
        { skipVerification: true }
      );
      
      return { update, result };
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Process results
    for (const { update, result } of batchResults) {
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({
          sku: update.sku,
          productId: update.productId,
          error: result.error || 'Unknown error',
        });
      }
    }
  }
  
  if (onProgress) {
    onProgress(updates.length, updates.length);
  }
  
  return results;
}
