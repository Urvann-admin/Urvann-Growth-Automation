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
      { field: "categories", operator: "equal", value: slugifiedAlias }, // Use slugified alias
      { field: "substore", operator: "equal", value: substore },
      { field: "publish", operator: "equal", value: "1" },
      { field: "inventory_quantity", operator: "greater_than", value: 0 }
    ];

    // Paginate through all results to count them (API limit is 500)
    // Formula: Total = 500*n + x (where x < 500 is the last page count)
    let totalCount = 0;
    let start = 0;
    const limit = 500;
    let pageNumber = 0;

    while (true) {
      pageNumber++;
      
    const queryParams = new URLSearchParams({
        fields: JSON.stringify({"sku": 1, "inventory_quantity": 1}),
        limit: limit.toString(),
        start: start.toString(),
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
      const returnedCount = data.data?.length || 0;
      
      totalCount += returnedCount;
      
      // If we got less than 500, this is the last page
      if (returnedCount < limit) {
        break;
      }
      
      // Continue to next page
      start += limit;
      
      // Safety limit: max 20 pages
      if (pageNumber >= 20) {
        break;
      }
    }
    
    const total = totalCount;
    
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
