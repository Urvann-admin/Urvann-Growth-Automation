// StoreHippo Products API service
import type { ParentMaster } from '@/models/parentMaster';

const BASE_URL = process.env.STOREHIPPO_BASE_URL || 'https://uaturvann.storehippo.com';
const ACCESS_KEY = process.env.URVANN_API_ACCESS_KEY || '13945648c9da5fdbfc71e3a397218e75';

// StoreHippo product payload format (legacy; parent master no longer syncs to StoreHippo)
export interface StoreHippoProductPayload {
  name: string;
  /** Omit on create — StoreHippo generates the URL slug; read back via GET after create. */
  alias?: string;
  price: number;
  publish: string; // "1" for published, "0" for unpublished
  categories: string[]; // category aliases (e.g. indoor-plants)
  collections?: string[]; // collection aliases (from collectionMaster)
  images: { image: string }[];
  inventory_quantity: number;
  substore?: string[]; // substores derived from hub (e.g. bgl-e, bgl-e2)
  seller?: string; // procurement seller _id or legacy seller_id
  sku?: string; // SKU code for the product
  description?: string; // Product description (rich text HTML)
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
  /** Product URL slug as returned by StoreHippo after create/fetch. */
  storeHippoAlias?: string;
  error?: string;
}

export interface StoreHippoSyncOptions {
  /** Collection aliases to send to StoreHippo (resolved from collectionIds in API) */
  collectionAliases?: string[];
}

function getPrimarySku(product: ParentMaster): string | undefined {
  return product.sku;
}
function getPrice(product: ParentMaster): number | undefined {
  return product.sellingPrice ?? product.price;
}

// Convert ParentMaster to StoreHippo format (legacy; parent master no longer syncs)
function convertToStoreHippoFormat(
  product: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>,
  options?: StoreHippoSyncOptions
): StoreHippoProductPayload {
  const displayName = product.finalName || product.plant;
  const primarySku = getPrimarySku(product as ParentMaster);
  const price = getPrice(product as ParentMaster);

  const payload: StoreHippoProductPayload = {
    name: displayName,
    price: price ?? 0,
    publish: '0',
    categories: product.categories,
    images: (product.images || []).map((url) => ({ image: url })),
    inventory_quantity: 0,
  };

  if (options?.collectionAliases && options.collectionAliases.length > 0) {
    payload.collections = options.collectionAliases;
  }

  if (product.substores && product.substores.length > 0) {
    payload.substore = product.substores;
  }
  if (product.seller) {
    payload.seller = product.seller;
  }
  if (primarySku) {
    payload.sku = primarySku;
  }
  if (product.description) {
    payload.description = product.description;
  }

  return payload;
}

export function extractProductFromApiPayload(json: unknown): { _id?: string; alias?: string } {
  if (!json || typeof json !== 'object') return {};
  const o = json as Record<string, unknown>;
  const data = o.data;
  const item: Record<string, unknown> =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : Array.isArray(data) && data[0] && typeof data[0] === 'object'
        ? (data[0] as Record<string, unknown>)
        : o;
  const id = item._id != null ? String(item._id) : undefined;
  const alias = item.alias != null ? String(item.alias) : undefined;
  return { _id: id, alias };
}

/** Required env for listing-product create → StoreHippo (no hardcoded key fallback). */
export function getListingProductStoreHippoEnv():
  | { ok: true; baseUrl: string; accessKey: string }
  | { ok: false; error: string } {
  const baseUrl = String(process.env.STOREHIPPO_BASE_URL ?? '').trim();
  const accessKey = String(process.env.URVANN_API_ACCESS_KEY ?? '').trim();
  if (!baseUrl) return { ok: false, error: 'STOREHIPPO_BASE_URL is required to create listing products on StoreHippo' };
  if (!accessKey) return { ok: false, error: 'URVANN_API_ACCESS_KEY is required to create listing products on StoreHippo' };
  return { ok: true, baseUrl, accessKey };
}

/** GET ms.products with filters — first row’s _id and alias (same pattern as product_id lookup). */
async function fetchStoreHippoProductByFilter(
  field: string,
  value: string,
  creds?: { baseUrl: string; accessKey: string }
): Promise<{ _id: string; alias?: string } | null> {
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const baseUrl = creds?.baseUrl ?? BASE_URL;
  const accessKey = creds?.accessKey ?? ACCESS_KEY;
  const filter = JSON.stringify([{ field, operator: 'eq', value: trimmed }]);
  const url = `${baseUrl}/api/1.1/entity/ms.products/?filters=${encodeURIComponent(filter)}`;

  const response = await fetch(url, {
    headers: { 'access-key': accessKey },
  });

  if (!response.ok) {
    console.error(`[StoreHippo] GET failed (${field}): ${response.status}`);
    return null;
  }

  const json: unknown = await response.json();
  const data = (json as { data?: unknown[] })?.data;
  const products = Array.isArray(data) ? data : [];
  const first = products[0] as { _id?: string; alias?: string } | undefined;
  if (first?._id) {
    return {
      _id: String(first._id),
      alias: first.alias != null ? String(first.alias) : undefined,
    };
  }
  return null;
}

/**
 * POST a raw JSON body to `ms.products` (listing flow). Use {@link getListingProductStoreHippoEnv} for credentials.
 */
export async function postMsProductCreate(
  body: Record<string, unknown>,
  hints: { displayName: string; sku?: string },
  creds: { baseUrl: string; accessKey: string }
): Promise<StoreHippoSyncResult> {
  const { displayName, sku } = hints;
  try {
    const response = await fetch(`${creds.baseUrl}/api/1.1/entity/ms.products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-key': creds.accessKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[StoreHippo] POST ms.products HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    let postJson: unknown = null;
    try {
      postJson = await response.json();
    } catch {
      /* non-JSON success body */
    }

    const fromPost = extractProductFromApiPayload(postJson);
    let productId = fromPost._id;
    let storeHippoAlias = fromPost.alias;

    if (!productId || !storeHippoAlias) {
      const byName = await fetchStoreHippoProductByFilter('name', displayName, creds);
      if (byName) {
        productId = productId || byName._id;
        storeHippoAlias = storeHippoAlias || byName.alias;
      }
    }

    if ((!productId || !storeHippoAlias) && sku) {
      const bySku = await fetchStoreHippoProductByFilter('sku', sku, creds);
      if (bySku) {
        productId = productId || bySku._id;
        storeHippoAlias = storeHippoAlias || bySku.alias;
      }
    }

    if (!productId) {
      console.warn(`[StoreHippo] Product created but could not resolve _id for name: ${displayName}`);
    }

    return {
      success: true,
      storeHippoId: productId,
      storeHippoAlias,
    };
  } catch (error) {
    console.error('[StoreHippo] postMsProductCreate error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Sync product to StoreHippo
export async function syncProductToStoreHippo(
  product: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>,
  options?: StoreHippoSyncOptions
): Promise<StoreHippoSyncResult> {
  try {
    const payload = convertToStoreHippoFormat(product, options);
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

    let postJson: unknown = null;
    try {
      postJson = await response.json();
    } catch {
      /* non-JSON success body */
    }

    const fromPost = extractProductFromApiPayload(postJson);
    let productId = fromPost._id;
    let storeHippoAlias = fromPost.alias;

    if (!productId || !storeHippoAlias) {
      const byName = await fetchStoreHippoProductByFilter('name', displayName);
      if (byName) {
        productId = productId || byName._id;
        storeHippoAlias = storeHippoAlias || byName.alias;
      }
    }

    const sku = getPrimarySku(product as ParentMaster);
    if ((!productId || !storeHippoAlias) && sku) {
      const bySku = await fetchStoreHippoProductByFilter('sku', sku);
      if (bySku) {
        productId = productId || bySku._id;
        storeHippoAlias = storeHippoAlias || bySku.alias;
      }
    }

    if (!productId) {
      console.warn(`[StoreHippo] Product created but could not resolve _id for name: ${displayName}`);
    }
    console.log(`[StoreHippo] ✅ Product created with ID: ${productId ?? '(unknown)'} alias: ${storeHippoAlias ?? '(unknown)'}`);

    return {
      success: true,
      storeHippoId: productId,
      storeHippoAlias,
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
  product: Partial<Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>>,
  options?: StoreHippoSyncOptions
): Promise<StoreHippoSyncResult> {
  try {
    // Convert partial product data to StoreHippo format
    const payload: Partial<StoreHippoProductPayload> = {};
    
    const displayName = product.finalName || product.plant;
    if (displayName) {
      payload.name = displayName;
    }
    
    const priceVal = getPrice(product as ParentMaster);
    if (priceVal !== undefined) payload.price = priceVal;
    if (product.categories) payload.categories = product.categories;
    if (options?.collectionAliases && options.collectionAliases.length > 0) {
      payload.collections = options.collectionAliases;
    }
    if (product.images) payload.images = product.images.map((url) => ({ image: url }));
    if (product.substores && product.substores.length > 0) payload.substore = product.substores;
    if (product.seller) payload.seller = product.seller;
    const skuVal = getPrimarySku(product as ParentMaster);
    if (skuVal) payload.sku = skuVal;
    if (product.description) payload.description = product.description;

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
      ...(result.alias ? { storeHippoAlias: String(result.alias) } : {}),
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