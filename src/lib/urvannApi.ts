// Urvann API utilities with rate limiting

const BASE_URL = 'https://www.urvann.com';
const SYNC_BASE_URL = 'https://urvann.storehippo.com'; // Use storehippo.com for sync mapping
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
 * Fetch products with since_id pagination to build SKU to product_id mapping
 * Fetches ALL products with publish and inventory fields
 */
export async function fetchProductsForMapping(sinceId: string = '0', limit: number = 500): Promise<{
  products: { sku: string; product_id: string; price: number; publish: string; inventory: number; name: string }[];
  hasMore: boolean;
  lastId: string;
}> {
  // Build query params using since_id pagination
  // Note: API returns inventory_quantity, not inventory
  const fieldsParam = encodeURIComponent(JSON.stringify({ sku: 1, price: 1, publish: 1, inventory_quantity: 1, name: 1 }));
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
  
  const products = productsArray.map((product: any) => ({
    sku: product.sku || '',
    product_id: product._id,
    price: product.price || 0,
    publish: String(product.publish ?? "0"),
    inventory: product.inventory_quantity ?? 0, // Map inventory_quantity from API to inventory
    name: product.name || '',
  }));
  
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
