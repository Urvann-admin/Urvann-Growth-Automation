import { ListingProductModel, type ListingProduct, type ListingParentItem } from '@/models/listingProduct';
import { PurchaseMasterModel } from '@/models/purchaseMaster';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { syncParentFromPurchases } from '@/app/api/purchase-master/syncParent';
import { deleteSkuMasterNewBySku, syncListingProductToSkuMasterNew } from '@/models/skuMasterNew';
import { toCanonicalParentSkuForPurchases } from '@/lib/skuGenerator';

function parentKeysAndUnits(product: ListingProduct): { key: string; units: number }[] {
  const items: ListingParentItem[] =
    product.parentItems?.length > 0
      ? product.parentItems
      : (product.parentSkus ?? []).map((sku) => ({
          parentSku: sku,
          quantity: product.quantity,
          unitPrice: 0,
        }));

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
    const totalUnits = Math.max(0, Math.floor(Number(product.inventory_quantity) || 0)) * Math.max(0, Number(item.quantity) || 0);
    if (!key || totalUnits <= 0) continue;
    map.set(key, (map.get(key) || 0) + totalUnits);
  }

  return [...map.entries()].map(([key, units]) => ({ key, units }));
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

async function adjustPurchasesForMoveToRevival(product: ListingProduct): Promise<void> {
  if (product.section !== 'listing') return;

  const hub = product.hub?.trim();
  const pairs = parentKeysAndUnits(product);

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

/**
 * For one listing product in section `listing`: migrate purchases, remove DB row, re-insert under `revival`,
 * refresh Sku_Master_New (delete then sync).
 */
export async function moveOneListingProductToRevival(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const doc = await ListingProductModel.findById(id);
  if (!doc) {
    return { ok: false, message: 'Listing product not found' };
  }

  const product = doc as ListingProduct;
  if (product.section !== 'listing') {
    return { ok: false, message: 'Only products in the Listing section can be moved to Revival' };
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

  await adjustPurchasesForMoveToRevival(product);

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

export async function moveListingProductsToRevival(
  ids: string[]
): Promise<{ moved: number; failed: { id: string; message: string }[] }> {
  const failed: { id: string; message: string }[] = [];
  let moved = 0;

  for (const id of ids) {
    const trimmed = String(id).trim();
    if (!trimmed) continue;
    const result = await moveOneListingProductToRevival(trimmed);
    if (result.ok) {
      moved += 1;
    } else {
      failed.push({ id: trimmed, message: result.message });
    }
  }

  return { moved, failed };
}
