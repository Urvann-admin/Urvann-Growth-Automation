// Product API utilities for fetching valid products from Urvann API

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

/**
 * Fetch all valid SKUs (publish=1, inventory_quantity > 0) from Urvann API
 */
export async function fetchValidProductSKUs(): Promise<Set<string>> {
  const validSKUs = new Set<string>();
  
  const filters = [
    { field: "publish", operator: "equal", value: "1" },
    { field: "inventory_quantity", operator: "greater_than", value: 0 }
  ];
  
  let start = 0;
  const limit = 500;
  
  try {
    while (true) {
      const queryParams = new URLSearchParams({
        fields: JSON.stringify({ sku: 1 }),
        limit: limit.toString(),
        start: start.toString(),
        filters: JSON.stringify(filters)
      });
      
      const apiUrl = `${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'access-key': ACCESS_KEY,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000),
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch products: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const products = data.data || [];
      
      // Add SKUs to the set
      for (const product of products) {
        if (product.sku) {
          validSKUs.add(product.sku);
        }
      }
      
      // If we got less than limit, we've reached the end
      if (products.length < limit) {
        break;
      }
      
      start += limit;
    }
    
    console.log(`Fetched ${validSKUs.size} valid product SKUs (publish=1, inventory>0)`);
  } catch (error) {
    console.error('Error fetching valid product SKUs:', error);
  }
  
  return validSKUs;
}

