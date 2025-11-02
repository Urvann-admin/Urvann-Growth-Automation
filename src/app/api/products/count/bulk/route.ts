import { NextResponse } from 'next/server';

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Rate limiting configuration
const MAX_RETRIES = 5; // More retries for rate limits
const RETRY_DELAY = 2000; // 2 second delay for retries
const CONCURRENT_LIMIT = 10; // Reduced to 10 concurrent requests to avoid rate limits
const BATCH_DELAY = 100; // Delay between batches (100ms)

// Utility function to slugify a string
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')       // Remove all non-word chars
    .replace(/--+/g, '-');          // Replace multiple - with single -
};

// Utility function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to make API request with retry logic
const makeApiRequest = async (url: string, headers: any, retryCount = 0): Promise<Response> => {
  try {
    const response = await fetch(url, { headers });
    
    // Handle 429 rate limit with exponential backoff
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        console.log(`Rate limited (429). Waiting ${backoffDelay}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
        await delay(backoffDelay);
        return makeApiRequest(url, headers, retryCount + 1);
      } else {
        // Max retries reached, return the 429 response
        return response;
      }
    }
    
    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount);
      await delay(backoffDelay);
      return makeApiRequest(url, headers, retryCount + 1);
    }
    throw error;
  }
};

// Function to get product count for a single category-substore combination
const getProductCount = async (category: string, substore: string): Promise<{ category: string; substore: string; count: number }> => {
  const slugifiedAlias = slugify(category);

  const filters = [
    { field: "categories", operator: "eq", value: slugifiedAlias },
    { field: "substore", operator: "eq", value: substore },
    { field: "publish", operator: "eq", value: "1" }
  ];

  const queryParams = new URLSearchParams({
    fields: JSON.stringify({"sku": 1}),
    limit: "1",
    start: "0",
    filters: JSON.stringify(filters)
  });

  const response = await makeApiRequest(`${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`, {
    'access-key': ACCESS_KEY,
    'Content-Type': 'application/json'
  });

  // makeApiRequest already handles retries, but if it still returns 429 after max retries, handle it
  if (response.status === 429) {
    // If still 429 after all retries, wait a bit more and try once more
    await delay(RETRY_DELAY * 2);
    const finalResponse = await makeApiRequest(`${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`, {
      'access-key': ACCESS_KEY,
      'Content-Type': 'application/json'
    });
    
    if (!finalResponse.ok) {
      throw new Error(`Urvann API error! status: ${finalResponse.status}`);
    }
    
    const data = await finalResponse.json();
    const total = data.paging?.total || 0;
    return { category, substore, count: total };
  }

  if (!response.ok) {
    throw new Error(`Urvann API error! status: ${response.status}`);
  }

  const data = await response.json();
  const total = data.paging?.total || 0;

  return { category, substore, count: total };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categories, substores } = body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Categories array is required' },
        { status: 400 }
      );
    }

    if (!substores || !Array.isArray(substores) || substores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Substores array is required' },
        { status: 400 }
      );
    }

    // Create all possible combinations
    const combinations: Array<{ category: string; substore: string }> = [];
    for (const category of categories) {
      for (const substore of substores) {
        combinations.push({ category, substore });
      }
    }

    const total = combinations.length;
    const results: Record<string, Record<string, number>> = {};

    // Initialize results structure
    for (const category of categories) {
      results[category] = {};
    }

    // Process in batches with controlled concurrency and delays
    for (let i = 0; i < combinations.length; i += CONCURRENT_LIMIT) {
      const batch = combinations.slice(i, i + CONCURRENT_LIMIT);
      
      // Process batch concurrently (no delays within batch)
      const batchPromises = batch.map(async ({ category, substore }) => {
        try {
          const result = await getProductCount(category, substore);
          return result;
        } catch (error: any) {
          // Error already handled in getProductCount with retries
          // If it still fails after all retries, return default
          console.error(`Failed to fetch count for ${category} - ${substore} after retries:`, error.message);
          return { category, substore, count: 0 };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Store results
      batchResults.forEach(({ category, substore, count }) => {
        results[category][substore] = count;
      });
      
      // Add delay between batches to respect rate limits (except for last batch)
      if (i + CONCURRENT_LIMIT < combinations.length) {
        await delay(BATCH_DELAY);
        console.log(`Processed batch ${Math.floor(i / CONCURRENT_LIMIT) + 1}/${Math.ceil(combinations.length / CONCURRENT_LIMIT)}. ${i + batch.length}/${combinations.length} completed`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      total: total,
      processed: Object.keys(results).length * Object.values(results)[0]?.length || 0
    });

  } catch (error) {
    console.error('Error in bulk product count:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product counts' },
      { status: 500 }
    );
  }
}
