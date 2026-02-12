// StoreHippo Products API service
import type { ParentMaster } from '@/models/parentMaster';

const BASE_URL = process.env.STOREHIPPO_BASE_URL || 'https://uaturvann.storehippo.com';
const ACCESS_KEY = process.env.URVANN_API_ACCESS_KEY || '13945648c9da5fdbfc71e3a397218e75';

// StoreHippo product payload format
export interface StoreHippoProductPayload {
  name: string;
  alias: string;
  price: number;
  publish: string; // "1" for published, "0" for unpublished
  categories: string[];
  images: { image: string }[];
  seller?: string; // seller_id from sellerMaster
  // Additional fields can be added as custom fields
  custom_fields?: {
    plant?: string;
    other_names?: string;
    variety?: string;
    colour?: string;
    height?: number;
    moss_stick?: string;
    size?: number;
    type?: string;
    inventory_quantity?: number;
  };
}

// StoreHippo product response format
export interface StoreHippoProductResponse {
  _id: string;
  name: string;
  alias: string;
  price: number;
  publish: string;
  categories: string[];
  images: string[];
  created_on: string;
  updated_on: string;
  custom_fields?: Record<string, any>;
}

export interface StoreHippoSyncResult {
  success: boolean;
  storeHippoId?: string;
  error?: string;
}

// Convert ParentMaster to StoreHippo format
function convertToStoreHippoFormat(product: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>): StoreHippoProductPayload {
  const displayName = product.finalName || product.plant;
  const alias = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  const payload: StoreHippoProductPayload = {
    name: displayName,
    alias: alias,
    price: product.price,
    publish: product.publish === 'published' ? '1' : '0',
    categories: product.categories,
    images: (product.images || []).map((url) => ({ image: url })),
    custom_fields: {
      plant: product.plant,
      other_names: product.otherNames,
      variety: product.variety,
      colour: product.colour,
      height: product.height,
      moss_stick: product.mossStick,
      size: product.size,
      type: product.type,
      inventory_quantity: product.inventoryQuantity,
    },
  };

  if (product.seller) {
    payload.seller = product.seller;
  }

  return payload;
}

// Fetch StoreHippo product _id by name (used after creation)
async function fetchStoreHippoProductIdByName(name: string): Promise<string | null> {
  const filter = JSON.stringify([{ field: 'name', operator: 'eq', value: name }]);
  const url = `${BASE_URL}/api/1.1/entity/ms.products/?filters=${encodeURIComponent(filter)}`;

  const response = await fetch(url, {
    headers: { 'access-key': ACCESS_KEY },
  });

  if (!response.ok) {
    console.error(`[StoreHippo] GET failed: ${response.status}`);
    return null;
  }

  const json: { data?: { _id: string }[] } = await response.json();
  const products = json.data;
  if (Array.isArray(products) && products.length > 0 && products[0]._id) {
    return products[0]._id;
  }
  return null;
}

// Sync product to StoreHippo
export async function syncProductToStoreHippo(
  product: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>
): Promise<StoreHippoSyncResult> {
  try {
    const payload = convertToStoreHippoFormat(product);
    const displayName = product.finalName || product.plant;

    console.log(`[StoreHippo] Syncing product: ${displayName}`);
    console.log(`[StoreHippo] Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(`${BASE_URL}/api/1.1/entity/ms.products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-key': ACCESS_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[StoreHippo] HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const productId = await fetchStoreHippoProductIdByName(displayName);
    if (!productId) {
      console.warn(`[StoreHippo] Product created but could not fetch _id for name: ${displayName}`);
    }
    console.log(`[StoreHippo] ✅ Product created with ID: ${productId}`);

    return {
      success: true,
      storeHippoId: productId ?? undefined,
    };
  } catch (error) {
    console.error('[StoreHippo] Sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Update product in StoreHippo
export async function updateProductInStoreHippo(
  storeHippoId: string,
  product: Partial<Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>>
): Promise<StoreHippoSyncResult> {
  try {
    // Convert partial product data to StoreHippo format
    const payload: Partial<StoreHippoProductPayload> = {};
    
    const displayName = product.finalName || product.plant;
    if (displayName) {
      payload.name = displayName;
      payload.alias = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
    }
    
    if (product.price !== undefined) payload.price = product.price;
    if (product.publish) payload.publish = product.publish === 'published' ? '1' : '0';
    if (product.categories) payload.categories = product.categories;
    if (product.images) payload.images = product.images.map((url) => ({ image: url }));
    if (product.seller) payload.seller = product.seller;
    
    if (product.otherNames || product.variety || product.colour || 
        product.height !== undefined || product.mossStick || 
        product.size !== undefined || product.type || 
        product.inventoryQuantity !== undefined) {
      payload.custom_fields = {
        ...(product.plant && { plant: product.plant }),
        ...(product.otherNames && { other_names: product.otherNames }),
        ...(product.variety && { variety: product.variety }),
        ...(product.colour && { colour: product.colour }),
        ...(product.height !== undefined && { height: product.height }),
        ...(product.mossStick && { moss_stick: product.mossStick }),
        ...(product.size !== undefined && { size: product.size }),
        ...(product.type && { type: product.type }),
        ...(product.inventoryQuantity !== undefined && { inventory_quantity: product.inventoryQuantity }),
      };
    }

    console.log(`[StoreHippo] Updating product: ${storeHippoId}`);

    const response = await fetch(`${BASE_URL}/api/1.1/entity/ms.products/${storeHippoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'access-key': ACCESS_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[StoreHippo] HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result: StoreHippoProductResponse = await response.json();
    console.log(`[StoreHippo] ✅ Product updated: ${result._id}`);

    return {
      success: true,
      storeHippoId: result._id,
    };
  } catch (error) {
    console.error('[StoreHippo] Update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Delete product from StoreHippo
export async function deleteProductFromStoreHippo(storeHippoId: string): Promise<StoreHippoSyncResult> {
  try {
    console.log(`[StoreHippo] Deleting product: ${storeHippoId}`);

    const response = await fetch(`${BASE_URL}/api/1.1/entity/ms.products/${storeHippoId}`, {
      method: 'DELETE',
      headers: {
        'access-key': ACCESS_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[StoreHippo] HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    console.log(`[StoreHippo] ✅ Product deleted: ${storeHippoId}`);

    return {
      success: true,
      storeHippoId,
    };
  } catch (error) {
    console.error('[StoreHippo] Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}