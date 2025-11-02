import { NextResponse } from 'next/server';

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Rate limiting configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second delay for retries

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
    
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      console.log(`Rate limited. Retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await delay(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      return makeApiRequest(url, headers, retryCount + 1);
    }
    
    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Request failed. Retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await delay(RETRY_DELAY * (retryCount + 1));
      return makeApiRequest(url, headers, retryCount + 1);
    }
    throw error;
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const substore = searchParams.get('substore');

    if (!category || !substore) {
      return NextResponse.json(
        { success: false, message: 'Category and substore are required' },
        { status: 400 }
      );
    }

    // This endpoint handles 429 rate limits with automatic retry + exponential backoff
    // Frontend batches 150 concurrent requests for optimal speed (<10s total load time)
    // Optimized: Uses paging.total from first response instead of fetching all products

    // Use the category parameter as alias (it will be passed as alias from the frontend)
    const slugifiedAlias = slugify(category);

    // Construct query parameters for Urvann API
    const filters = [
      { field: "categories", operator: "eq", value: slugifiedAlias }, // Use slugified alias
      { field: "substore", operator: "eq", value: substore },
      { field: "publish", operator: "eq", value: "1" }
    ];

    // Make a single request to get the total count from paging
    // No need to fetch all products - the API's paging.total is reliable
    const queryParams = new URLSearchParams({
      fields: JSON.stringify({"sku": 1}), // Minimal fields for faster response
      limit: "1", // Only need 1 record to get paging info
      start: "0",
      filters: JSON.stringify(filters)
    });

    const response = await makeApiRequest(`${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`, {
      'access-key': ACCESS_KEY,
      'Content-Type': 'application/json'
    });

    if (!response.ok) {
      throw new Error(`Urvann API error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Get total from paging - this is the accurate count from the API
    const total = data.paging?.total || 0;
    
    return NextResponse.json({ 
      success: true, 
      total: total, // Use paging.total directly - much faster!
      debug: {
        category,
        alias: category,
        slugifiedAlias,
        substore,
        filters,
        pagingTotal: total
      }
    });

  } catch (error) {
    console.error('Error fetching product count:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product count' },
      { status: 500 }
    );
  }
}
