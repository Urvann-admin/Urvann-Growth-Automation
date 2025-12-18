// Urvann API utilities with rate limiting

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Rate limiting configuration - optimized for speed while being respectful
const RATE_LIMIT_DELAY = 50; // 50ms between requests (20 req/sec)
const MAX_RETRIES = 3;
const RETRY_DELAY = 500; // 500ms initial retry delay

let lastRequestTime = 0;
let requestQueue = Promise.resolve();

// Utility function to add delay for rate limiting with queue
async function rateLimitDelay() {
  // Queue requests to maintain order and rate limit
  const currentRequest = requestQueue.then(async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    
    lastRequestTime = Date.now();
  });
  
  requestQueue = currentRequest;
  await currentRequest;
}

// Utility function to make API request with retry logic
async function makeApiRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
  await rateLimitDelay();
  
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
    
    // Exponential backoff for rate limiting
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Rate limited. Retrying in ${backoffDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return makeApiRequest(url, options, retryCount + 1);
    }
    
    return response;
  } catch (error) {
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
 * Fetch products with pagination to build SKU to product_id mapping
 * Fetches ALL products with publish and inventory fields
 */
export async function fetchProductsForMapping(start = 0, limit = 50): Promise<{
  products: { sku: string; product_id: string; price: number; publish: string; inventory: number }[];
  hasMore: boolean;
}> {
  const queryParams = new URLSearchParams({
    fields: JSON.stringify({ sku: 1, price: 1, publish: 1, inventory: 1 }),
    limit: limit.toString(),
    start: start.toString(),
  });
  
  const url = `${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`;
  
  const response = await makeApiRequest(url, { method: 'GET' });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const products = (data.data || []).map((product: any) => ({
    sku: product.sku,
    product_id: product._id,
    price: product.price || 0,
    publish: String(product.publish || "0"),
    inventory: product.inventory || 0,
  }));
  
  return {
    products,
    hasMore: products.length === limit,
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
  frequentlyBoughtSkus: string[]
): Promise<{ success: boolean; error?: string }> {
  const url = `${BASE_URL}/api/1.1/entity/ms.products/${productId}`;
  
  try {
    const response = await makeApiRequest(url, {
      method: 'PUT',
      body: JSON.stringify({
        frequently_bought_together: frequentlyBoughtSkus,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${errorText}` 
      };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Batch update multiple products (with rate limiting)
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
  
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    
    if (onProgress) {
      onProgress(i, updates.length, update.sku);
    }
    
    const result = await updateProductFrequentlyBought(
      update.productId, 
      update.frequentlyBoughtSkus
    );
    
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
  
  if (onProgress) {
    onProgress(updates.length, updates.length);
  }
  
  return results;
}
