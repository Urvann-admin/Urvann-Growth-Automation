// StoreHippo Categories API service
import { CategoryModel } from '@/models/category';

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Rate limiting configuration - reuse from urvannApi.ts
const INITIAL_MAX_CONCURRENT_REQUESTS = 50;
const MIN_CONCURRENT_REQUESTS = 10;
const MAX_RETRIES = 8;
const RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

// Adaptive rate limiting
let currentMaxConcurrency = INITIAL_MAX_CONCURRENT_REQUESTS;
let rateLimitHits = 0;
let lastRateLimitTime = 0;
const RATE_LIMIT_WINDOW = 60000; // 1 minute window

// Semaphore-based rate limiting
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

// StoreHippo category payload format (API does not accept _id on create)
export interface StoreHippoCategoryPayload {
  name: string;
  alias: string;
  description: string;
  publish: string; // "1" or "0"
  sort_order: number;
  parent: string | null;
  substore: string[];
}

// StoreHippo category response format
export interface StoreHippoCategoryResponse {
  _id: string;
  name: string;
  alias: string;
  description: string;
  publish: string;
  sort_order: number;
  parent: string | null;
  created_on: string;
  updated_on: string;
  substore: string[];
}

// Adaptive rate limiting - adjusts concurrency based on rate limit hits
async function rateLimitDelay(): Promise<() => void> {
  // Wait for available slot if at max concurrency
  if (activeRequests >= currentMaxConcurrency) {
    await new Promise<void>(resolve => {
      requestQueue.push(resolve);
    });
  }
  
  activeRequests++;
  
  // Gradually increase concurrency if we haven't hit rate limits recently
  const timeSinceLastRateLimit = Date.now() - lastRateLimitTime;
  if (timeSinceLastRateLimit > RATE_LIMIT_WINDOW && currentMaxConcurrency < INITIAL_MAX_CONCURRENT_REQUESTS) {
    currentMaxConcurrency = Math.min(
      INITIAL_MAX_CONCURRENT_REQUESTS,
      currentMaxConcurrency + 5
    );
    rateLimitHits = 0;
  }
  
  // Return release function
  return () => {
    activeRequests--;
    const next = requestQueue.shift();
    if (next) next();
  };
}

// Reduce concurrency when we hit rate limits
function handleRateLimit() {
  rateLimitHits++;
  lastRateLimitTime = Date.now();
  
  const reductionFactor = Math.min(rateLimitHits, 5);
  currentMaxConcurrency = Math.max(
    MIN_CONCURRENT_REQUESTS,
    Math.floor(INITIAL_MAX_CONCURRENT_REQUESTS / (1 + reductionFactor * 0.5))
  );
  
  console.log(`[StoreHippo Categories] Reducing concurrency to ${currentMaxConcurrency} (rate limit hits: ${rateLimitHits})`);
}

const REQUEST_TIMEOUT_MS = 20000; // 20s timeout

// Make API request with retry logic and adaptive rate limiting
async function makeApiRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const attempt = retryCount + 1;
  console.log(`[StoreHippo Categories] API request attempt ${attempt}/${MAX_RETRIES + 1}: ${method} ${url}`);
  if (options.body && typeof options.body === 'string') {
    console.log(`[StoreHippo Categories] Request body length: ${options.body.length} chars`);
  }

  const release = await rateLimitDelay();
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'access-key': ACCESS_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const elapsed = Date.now() - startTime;
    release();

    console.log(`[StoreHippo Categories] Response received in ${elapsed}ms: ${response.status} ${response.statusText}`);

    // Handle rate limiting with adaptive backoff
    if ((response.status === 429 || response.status === 503) && retryCount < MAX_RETRIES) {
      if (response.status === 429) {
        handleRateLimit();
      }
      const retryAfterHeader = response.headers.get('retry-after');
      let backoffDelay: number;
      if (retryAfterHeader) {
        const retryAfterSeconds = Number(retryAfterHeader);
        const jitter = Math.floor(Math.random() * 1000);
        backoffDelay = (retryAfterSeconds * 1000) + jitter;
      } else {
        const baseDelay = Math.min(RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
        const jitter = Math.floor(Math.random() * baseDelay * 0.1);
        backoffDelay = baseDelay + jitter;
      }
      console.log(`[StoreHippo Categories] Rate limited (${response.status}), retrying in ${backoffDelay}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return makeApiRequest(url, options, retryCount + 1);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`[StoreHippo Categories] Non-OK response body:`, errorBody.slice(0, 500));
    }

    return response;
  } catch (error) {
    release();
    const elapsed = Date.now() - startTime;
    const isTimeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error(`[StoreHippo Categories] Request failed after ${elapsed}ms (timeout=${REQUEST_TIMEOUT_MS}ms):`, {
      errorName: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      isTimeout,
      attempt,
      maxRetries: MAX_RETRIES,
    });

    if (retryCount < MAX_RETRIES) {
      const baseDelay = Math.min(RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
      const jitter = Math.floor(Math.random() * baseDelay * 0.1);
      const backoffDelay = baseDelay + jitter;
      console.log(`[StoreHippo Categories] Retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return makeApiRequest(url, options, retryCount + 1);
    }

    console.error(`[StoreHippo Categories] All ${MAX_RETRIES + 1} attempts exhausted for ${method} ${url}`);
    throw error;
  }
}

/**
 * Find parent category ID from our database
 */
export async function findParentCategoryId(parentCategoryName: string): Promise<string | null> {
  if (!parentCategoryName || !parentCategoryName.trim()) {
    console.log(`[StoreHippo Categories] Parent lookup skipped: empty name`);
    return null;
  }
  const name = parentCategoryName.trim();
  console.log(`[StoreHippo Categories] Looking up parent by category name: "${name}"`);
  try {
    const parentCategory = await CategoryModel.findByCategory(name);
    if (!parentCategory || !parentCategory.categoryId) {
      console.warn(`[StoreHippo Categories] Parent category not found in DB for name: "${name}"`);
      return null;
    }
    console.log(`[StoreHippo Categories] Parent found: categoryId=${parentCategory.categoryId}`);
    return parentCategory.categoryId;
  } catch (error) {
    console.error(`[StoreHippo Categories] Error finding parent category "${name}":`, error);
    return null;
  }
}

/**
 * Map our category data to StoreHippo format
 */
export async function mapCategoryToStoreHippo(categoryData: any): Promise<StoreHippoCategoryPayload> {
  console.log(`[StoreHippo Categories] Mapping to StoreHippo format: categoryId=${categoryData.categoryId}, typeOfCategory=${categoryData.typeOfCategory}, l1Parent=${categoryData.l1Parent ?? '(none)'}, l2Parent=${categoryData.l2Parent ?? '(none)'}`);
  let parentId: string | null = null;

  if (categoryData.typeOfCategory === 'L2' && categoryData.l1Parent) {
    parentId = await findParentCategoryId(categoryData.l1Parent);
  } else if (categoryData.typeOfCategory === 'L3' && categoryData.l2Parent) {
    parentId = await findParentCategoryId(categoryData.l2Parent);
  }

  const payload: StoreHippoCategoryPayload = {
    name: categoryData.category,
    alias: categoryData.alias,
    description: categoryData.description || '',
    publish: categoryData.publish ? '1' : '0',
    sort_order: categoryData.priorityOrder,
    parent: parentId,
    substore: categoryData.substores || []
  };
  console.log(`[StoreHippo Categories] Mapped payload (no _id):`, JSON.stringify(payload, null, 2));
  return payload;
}

/**
 * Fetch category from StoreHippo by alias (GET with filters).
 * URL format: .../ms.categories/?filters=[{"field":"alias","operator":"eq","value":"<alias>"}]
 */
export async function fetchStoreHippoCategoryByAlias(alias: string): Promise<StoreHippoCategoryResponse | null> {
  if (!alias || !alias.trim()) return null;
  const filters = [{ field: 'alias', operator: 'eq', value: alias.trim() }];
  const filtersParam = encodeURIComponent(JSON.stringify(filters));
  const url = `${BASE_URL}/api/1.1/entity/ms.categories/?filters=${filtersParam}`;
  console.log(`[StoreHippo Categories] GET by alias: ${alias.trim()}`);
  try {
    const response = await makeApiRequest(url, { method: 'GET' });
    if (!response.ok) {
      console.warn(`[StoreHippo Categories] GET by alias failed: ${response.status}`);
      return null;
    }
    const json = await response.json();
    const data = Array.isArray(json?.data) ? json.data : (json?.data != null ? [json.data] : []);
    const first = data[0];
    if (!first || !first._id) {
      console.warn(`[StoreHippo Categories] No category found in GET response for alias=${alias}`);
      return null;
    }
    console.log(`[StoreHippo Categories] Fetched category _id=${first._id} for alias=${alias}`);
    return first as StoreHippoCategoryResponse;
  } catch (error) {
    console.error(`[StoreHippo Categories] fetchStoreHippoCategoryByAlias failed:`, error);
    return null;
  }
}

/**
 * Create category in StoreHippo
 */
export async function createStoreHippoCategory(categoryData: StoreHippoCategoryPayload): Promise<StoreHippoCategoryResponse> {
  const url = `${BASE_URL}/api/1.1/entity/ms.categories`;
  console.log(`[StoreHippo Categories] POST ${url}`, {
    name: categoryData.name,
    alias: categoryData.alias,
    parent: categoryData.parent,
    sort_order: categoryData.sort_order,
    publish: categoryData.publish,
    substoreCount: categoryData.substore.length,
    substores: categoryData.substore,
  });

  try {
    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`[StoreHippo Categories] API error response (${response.status}):`, errorText);
      throw new Error(`StoreHippo API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log(`[StoreHippo Categories] ✅ Category created successfully:`, {
      _id: result._id,
      name: result.name,
      status: response.status,
    });
    return result;
  } catch (error) {
    console.error(`[StoreHippo Categories] ❌ createStoreHippoCategory failed:`, error);
    throw error;
  }
}

/**
 * Main function to sync category to StoreHippo.
 * After create, fetches the category by alias to get StoreHippo _id and returns it for saving in our DB.
 */
export async function syncCategoryToStoreHippo(categoryData: any): Promise<{ success: boolean; data?: StoreHippoCategoryResponse; storeHippoId?: string; error?: string }> {
  const categoryId = categoryData?.categoryId ?? categoryData?.category ?? '?';
  const categoryName = categoryData?.category ?? categoryId;
  console.log(`[StoreHippo Categories] syncCategoryToStoreHippo started: categoryId=${categoryId}, name=${categoryName}`);

  try {
    const storeHippoPayload = await mapCategoryToStoreHippo(categoryData);
    const result = await createStoreHippoCategory(storeHippoPayload);
    // If POST response already has _id, use it; otherwise fetch by alias
    let storeHippoId: string | undefined = result?._id;
    if (!storeHippoId) {
      const fetched = await fetchStoreHippoCategoryByAlias(storeHippoPayload.alias);
      storeHippoId = fetched?._id ?? undefined;
    }
    console.log(`[StoreHippo Categories] syncCategoryToStoreHippo completed: storeHippoId=${storeHippoId}`);
    return { success: true, data: result, storeHippoId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    console.error(`[StoreHippo Categories] syncCategoryToStoreHippo failed for categoryId=${categoryId}:`, {
      errorName,
      errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: errorMessage };
  }
}