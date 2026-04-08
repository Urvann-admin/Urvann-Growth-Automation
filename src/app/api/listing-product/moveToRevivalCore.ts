import { ListingProductModel, type ListingProduct, type ListingParentItem } from '@/models/listingProduct';
import { PurchaseMasterModel } from '@/models/purchaseMaster';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { syncParentFromPurchases } from '@/app/api/purchase-master/syncParent';
import { deleteSkuMasterNewBySku, syncListingProductToSkuMasterNew } from '@/models/skuMasterNew';
import { generateSKU, toCanonicalParentSkuForPurchases } from '@/lib/skuGenerator';

function parentItemsResolved(product: ListingProduct): ListingParentItem[] {
  return product.parentItems?.length > 0
    ? product.parentItems
    : (product.parentSkus ?? []).map((sku) => ({
        parentSku: sku,
        quantity: product.quantity,
        unitPrice: 0,
      }));
}

/** Purchase units per parent key for `setCount` sets (not full listing inventory). */
function parentKeysAndUnitsForSetCount(
  product: ListingProduct,
  setCount: number
): { key: string; units: number }[] {
  const items = parentItemsResolved(product);
  const sets = Math.max(0, Math.floor(Number(setCount) || 0));
  const hubStr = product.hub?.trim();
  const map = new Map<string, number>();

  for (const item of items) {
    const key =
      product.listingType === 'parent' && hubStr
        ? String(item.parentSku || '').trim()
        : toCanonicalParentSkuForPurchases(
            product.listingType ?? 'child',
            product.hub,
            item.parentSku
          );
    const totalUnits = sets * Math.max(0, Number(item.quantity) || 0);
    if (!key || totalUnits <= 0) continue;
    map.set(key, (map.get(key) || 0) + totalUnits);
  }

  return [...map.entries()].map(([key, units]) => ({ key, units }));
}

function parentKeysAndUnits(product: ListingProduct): { key: string; units: number }[] {
  const inv = Math.max(0, Math.floor(Number(product.inventory_quantity) || 0));
  return parentKeysAndUnitsForSetCount(product, inv);
}

/** Undo listed_quantity increases from when this listing-line was created (listing section only). */
async function releaseListedQuantityForParent(parentSku: string, units: number): Promise<void> {
  if (units <= 0) return;
  let remaining = units;
  const purchases = await PurchaseMasterModel.findByParentSku(parentSku);
  const listingPurchases = purchases
    .filter((p) => (p.type?.listing ?? 0) > 0)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

  for (const purchase of listingPurchases) {
    if (remaining <= 0) break;
    const currentListed = Number((purchase as { listed_quantity?: number }).listed_quantity ?? 0) || 0;
    const toRelease = Math.min(remaining, currentListed);
    if (toRelease > 0 && purchase._id) {
      await PurchaseMasterModel.update(purchase._id, {
        listed_quantity: Math.max(0, currentListed - toRelease),
      });
      remaining -= toRelease;
    }
  }
}

/** Move allocation from purchase.type.listing to type.revival (same rules as growth → listing). */
async function movePurchaseListingToRevival(parentSku: string, units: number): Promise<void> {
  if (units <= 0) return;
  let remaining = units;
  const purchases = await PurchaseMasterModel.findByParentSku(parentSku);
  const listingPurchases = purchases
    .filter((p) => (p.type?.listing ?? 0) > 0)
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

  for (const row of listingPurchases) {
    if (remaining <= 0) break;

    const t = row.type;
    const typeSum =
      (Number(t?.listing ?? 0) || 0) +
      (Number(t?.revival ?? 0) || 0) +
      (Number(t?.growth ?? 0) || 0) +
      (Number(t?.consumers ?? 0) || 0);
    const isFlagMode = typeSum <= 1;

    const listingAlloc =
      (t?.listing ?? 0) > 0
        ? isFlagMode
          ? Math.max(Number(row.quantity) || 0, 0)
          : Number(t.listing) || 0
        : 0;
    if (listingAlloc <= 0) continue;

    const toMove = Math.min(listingAlloc, remaining);
    const currentListingNum = Number(t?.listing ?? 0) || 0;
    const currentRevivalNum = Number(t?.revival ?? 0) || 0;
    const newListingSide = listingAlloc - toMove;
    const newRevival = currentRevivalNum + toMove;

    const updatedType: PurchaseTypeBreakdown = { ...t };

    if (isFlagMode && currentListingNum > 0) {
      if (newListingSide <= 0) {
        delete updatedType.listing;
      } else {
        updatedType.listing = newListingSide;
      }
      updatedType.revival = newRevival > 0 ? newRevival : undefined;
    } else {
      const newListingNum = currentListingNum - toMove;
      updatedType.listing = newListingNum > 0 ? newListingNum : undefined;
      updatedType.revival = newRevival > 0 ? newRevival : undefined;
    }

    if (updatedType.listing === 0 || updatedType.listing === undefined) {
      delete updatedType.listing;
    }
    if (updatedType.revival === 0 || updatedType.revival === undefined) {
      delete updatedType.revival;
    }

    await PurchaseMasterModel.update(row._id!, { type: updatedType });
    remaining -= toMove;
  }
}

async function adjustPurchasesForMoveToRevival(
  product: ListingProduct,
  setCount: number
): Promise<void> {
  if (product.section !== 'listing') return;

  const hub = product.hub?.trim();
  const pairs = parentKeysAndUnitsForSetCount(product, setCount);

  for (const { key, units } of pairs) {
    if (units <= 0) continue;
    await releaseListedQuantityForParent(key, units);
    await movePurchaseListingToRevival(key, units);
    await syncParentFromPurchases(key, hub);
  }
}

function stripForInsert(doc: ListingProduct): Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'> {
  const { _id, createdAt, updatedAt, ...rest } = doc as ListingProduct & {
    _id?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  return {
    ...rest,
    section: 'revival',
  };
}

/** New revival row from a partial child move: new SKU, no StoreHippo carry-over. */
function stripForPartialRevivalChild(
  doc: ListingProduct,
  setInventory: number,
  sku: string
): Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'> {
  const base = stripForInsert(doc);
  return {
    ...base,
    sku,
    inventory_quantity: Math.max(0, Math.floor(setInventory)),
    publish_status: setInventory > 0 ? 1 : 0,
    storeHippoId: undefined,
    product_id: undefined,
    storeHippoAlias: undefined,
  };
}

/**
 * For one listing product in section `listing`: migrate purchases, remove DB row, re-insert under `revival`,
 * refresh Sku_Master_New (delete then sync).
 */
export async function moveOneListingProductToRevival(
  id: string,
  options?: { quantity?: number }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const doc = await ListingProductModel.findById(id);
  if (!doc) {
    return { ok: false, message: 'Listing product not found' };
  }

  const product = doc as ListingProduct;
  if (product.section !== 'listing') {
    return { ok: false, message: 'Only products in the Listing section can be moved to Revival' };
  }

  const inv = Math.max(0, Math.floor(Number(product.inventory_quantity) || 0));
  if (inv <= 0) {
    return { ok: false, message: 'No inventory to move' };
  }

  let q =
    options?.quantity != null ? Math.floor(Number(options.quantity)) : inv;
  if (!Number.isFinite(q) || q <= 0) {
    return { ok: false, message: 'Quantity must be a positive number' };
  }
  q = Math.min(q, inv);

  const isParentListing = product.listingType === 'parent';
  if (isParentListing && q < inv) {
    return {
      ok: false,
      message:
        'Parent listings must be moved in full. Use the full quantity shown, or adjust inventory before moving.',
    };
  }

  if (product.listingType === 'parent' && product.hub && product.parentItems?.[0]?.parentSku) {
    const canon = toCanonicalParentSkuForPurchases('parent', product.hub, product.parentItems[0].parentSku);
    const dup = await ListingProductModel.findExistingParentListingForHubSection(
      product.hub,
      'revival',
      canon
    );
    if (dup && String(dup._id) !== String(product._id)) {
      return {
        ok: false,
        message: `Parent already has a revival listing for hub "${product.hub}" (SKU: ${dup.sku ?? '—'}).`,
      };
    }
  }

  const isFullMove = q >= inv;

  if (isFullMove) {
    await adjustPurchasesForMoveToRevival(product, inv);

    const sku = product.sku ? String(product.sku).trim() : '';
    if (sku) {
      await deleteSkuMasterNewBySku(sku);
    }

    const insertPayload = stripForInsert(product);
    await ListingProductModel.delete(id);
    const created = await ListingProductModel.create(insertPayload);
    await syncListingProductToSkuMasterNew(created as ListingProduct);

    return { ok: true };
  }

  // Partial move: child-style rows only (anything that is not an explicit parent listing)
  if (product.listingType === 'parent') {
    return { ok: false, message: 'Partial move to Revival is only supported for child listings' };
  }

  const hub = product.hub?.trim();
  const plant = String(product.plant || '').trim();
  if (!hub || !plant) {
    return { ok: false, message: 'Child listing must have hub and product name to allocate a revival SKU' };
  }

  await adjustPurchasesForMoveToRevival(product, q);

  const remaining = inv - q;
  await ListingProductModel.update(id, {
    inventory_quantity: remaining,
    publish_status: remaining > 0 ? 1 : 0,
  });

  const setQuantity = Number(product.setQuantity || 0);
  const skuQty = setQuantity > 0 ? setQuantity : Number(product.quantity || 1);
  let newSku: string | undefined;
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const candidate = await generateSKU(hub, plant, skuQty || 1);
      const clash = await ListingProductModel.findBySku(candidate);
      if (!clash) {
        newSku = candidate;
        break;
      }
    } catch {
      break;
    }
  }
  if (!newSku) {
    return { ok: false, message: 'Could not allocate a unique SKU for the Revival row' };
  }

  const insertPayload = stripForPartialRevivalChild(product, q, newSku);
  const created = await ListingProductModel.create(insertPayload);
  await syncListingProductToSkuMasterNew(created as ListingProduct);

  const updatedListing = await ListingProductModel.findById(id);
  if (updatedListing) {
    await syncListingProductToSkuMasterNew(updatedListing as ListingProduct);
  }

  return { ok: true };
}

export type MoveToRevivalEntry = { id: string; quantity?: number };

function normalizeMoveToRevivalEntries(entries: MoveToRevivalEntry[] | string[]): MoveToRevivalEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  if (typeof entries[0] === 'string') {
    return (entries as string[])
      .map((id) => ({ id: String(id).trim() }))
      .filter((e) => e.id);
  }
  return (entries as MoveToRevivalEntry[])
    .map((e) => ({
      id: String(e.id ?? '').trim(),
      quantity: e.quantity,
    }))
    .filter((e) => e.id);
}

export async function moveListingProductsToRevival(
  entries: MoveToRevivalEntry[] | string[]
): Promise<{ moved: number; failed: { id: string; message: string }[] }> {
  const failed: { id: string; message: string }[] = [];
  let moved = 0;

  const normalized = normalizeMoveToRevivalEntries(entries);

  for (const entry of normalized) {
    const trimmed = String(entry.id).trim();
    if (!trimmed) continue;
    const result = await moveOneListingProductToRevival(trimmed, {
      quantity: entry.quantity,
    });
    if (result.ok) {
      moved += 1;
    } else {
      failed.push({ id: trimmed, message: result.message });
    }
  }

  return { moved, failed };
}
