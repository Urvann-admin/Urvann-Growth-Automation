import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import type { ListingParentItem, ListingProductListingType } from '@/models/listingProduct';
import { expectedParentSkuForHub } from '@/lib/childListingHubSku';

/** Document shape for Inventory_Master.Sku_Master_New (synced from listing products) */
export interface SkuMasterNewDocument {
  _id?: ObjectId;
  SKU: string;
  Inventory: number;
  parent_Sku_1: string | null;
  parent_Sku_2: string | null;
  parent_Sku_3: string | null;
  parent_Sku_4: string | null;
  parent_Sku_5: string | null;
  parent_Sku_6: string | null;
  parent_Sku_7: string | null;
  parent_Sku_8: string | null;
  parent_Sku_9: string | null;
  parent_Sku_10: string | null;
  parent_qty_1: number | null;
  parent_qty_2: number | null;
  parent_qty_3: number | null;
  parent_qty_4: number | null;
  parent_qty_5: number | null;
  parent_qty_6: number | null;
  parent_qty_7: number | null;
  parent_qty_8: number | null;
  parent_qty_9: number | null;
  parent_qty_10: number | null;
}

const COLLECTION_NAME = 'Sku_Master_New';
const DB_NAME = 'Inventory_Master';

async function getSkuMasterNewCollection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<SkuMasterNewDocument>(COLLECTION_NAME);
}

/** Minimal shape needed to build a Sku_Master_New document from a listing product */
export interface ListingProductSyncInput {
  sku?: string;
  inventory_quantity: number;
  parentItems?: ListingParentItem[];
  hub?: string;
  listingType?: ListingProductListingType;
}

/**
 * Builds a Sku_Master_New document from a listing product.
 * parent_Sku_1..10 and parent_qty_1..10 are filled from parentItems[0..9]; empty slots are null.
 *
 * With a hub, each line uses the same rule as listing persistence: prepend hub letter only when
 * the SKU is not already qualified for that hub (avoids double prefix when parent lines are hub-prefixed).
 */
function parentSkuForSkuMasterRow(item: ListingParentItem, hub: string | undefined): string {
  const raw = String(item.parentSku ?? '').trim();
  if (!raw) return raw;
  if (!hub?.trim()) return raw;
  const out = expectedParentSkuForHub(hub, raw);
  return out || raw;
}

function buildSkuMasterNewDoc(input: ListingProductSyncInput): Omit<SkuMasterNewDocument, '_id'> {
  const parentItems = input.parentItems ?? [];
  const hub = input.hub?.trim() || undefined;
  const doc: Omit<SkuMasterNewDocument, '_id'> = {
    SKU: String(input.sku ?? '').trim(),
    Inventory: typeof input.inventory_quantity === 'number' ? input.inventory_quantity : 0,
    parent_Sku_1: null,
    parent_Sku_2: null,
    parent_Sku_3: null,
    parent_Sku_4: null,
    parent_Sku_5: null,
    parent_Sku_6: null,
    parent_Sku_7: null,
    parent_Sku_8: null,
    parent_Sku_9: null,
    parent_Sku_10: null,
    parent_qty_1: null,
    parent_qty_2: null,
    parent_qty_3: null,
    parent_qty_4: null,
    parent_qty_5: null,
    parent_qty_6: null,
    parent_qty_7: null,
    parent_qty_8: null,
    parent_qty_9: null,
    parent_qty_10: null,
  };

  for (let i = 0; i < 10; i++) {
    const item = parentItems[i];
    const skuKey = `parent_Sku_${i + 1}` as keyof typeof doc;
    const qtyKey = `parent_qty_${i + 1}` as keyof typeof doc;
    if (item && item.parentSku != null && item.parentSku !== '') {
      (doc as Record<string, unknown>)[skuKey] = parentSkuForSkuMasterRow(item, hub);
      (doc as Record<string, unknown>)[qtyKey] =
        typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0;
    }
  }

  return doc;
}

/**
 * Syncs a listing product to Inventory_Master.Sku_Master_New.
 * Upserts by SKU. If listing product has no sku, sync is skipped.
 * Errors are logged; does not throw so the main save is not blocked.
 */
export async function syncListingProductToSkuMasterNew(
  listingProduct: ListingProductSyncInput
): Promise<{ ok: boolean; error?: string }> {
  const sku = listingProduct.sku ? String(listingProduct.sku).trim() : '';
  if (!sku) {
    console.warn('[SkuMasterNew] Sync skipped: listing product has no SKU');
    return { ok: true };
  }

  try {
    const collection = await getSkuMasterNewCollection();
    const doc = buildSkuMasterNewDoc(listingProduct);
    await collection.replaceOne({ SKU: sku }, doc, { upsert: true });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[SkuMasterNew] Sync failed for SKU', sku, message);
    return { ok: false, error: message };
  }
}

/** Removes one row from Inventory_Master.Sku_Master_New by listing SKU (best-effort). */
export async function deleteSkuMasterNewBySku(sku: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = String(sku ?? '').trim();
  if (!trimmed) return { ok: true };

  try {
    const collection = await getSkuMasterNewCollection();
    await collection.deleteOne({ SKU: trimmed });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[SkuMasterNew] Delete failed for SKU', trimmed, message);
    return { ok: false, error: message };
  }
}
