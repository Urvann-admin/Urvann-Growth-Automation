import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { PurchaseMasterModel } from '@/models/purchaseMaster';
import { ParentMasterModel, isBaseParent } from '@/models/parentMaster';

/**
 * Recompute a parent's typeBreakdown and inventory_quantity from all purchase
 * rows for that parentSku, then update the parent. Call this after creating or
 * updating purchases so the parent stays in sync.
 */
export async function syncParentFromPurchases(parentSku: string): Promise<void> {
  const sku = String(parentSku || '').trim();
  if (!sku) return;

  const purchases = await PurchaseMasterModel.findAll({ parentSku: sku });
  const typeBreakdown: PurchaseTypeBreakdown = {
    listing: 0,
    revival: 0,
    growth: 0,
    consumers: 0,
  };
  let listingQuantity = 0;

  for (const row of purchases) {
    const t = row.type;
    const rowQty = Number(row.quantity) || 0;
    const listedQty = Number((row as { listed_quantity?: number }).listed_quantity ?? 0) || 0;

    if (t?.listing != null && t.listing > 0) {
      const grossQ = Number(t.listing) > 1 ? Math.floor(Number(t.listing)) : Math.floor(rowQty);
      const availableQ = Math.max(0, grossQ - Math.floor(listedQty));
      typeBreakdown.listing! += availableQ;
      if (availableQ > 0) listingQuantity += availableQ;
    }
    if (t?.revival != null && t.revival > 0) {
      typeBreakdown.revival! += Number(t.revival) > 1 ? Math.floor(Number(t.revival)) : Math.floor(rowQty);
    }
    if (t?.growth != null && t.growth > 0) {
      typeBreakdown.growth! += Number(t.growth) > 1 ? Math.floor(Number(t.growth)) : Math.floor(rowQty);
    }
    if (t?.consumers != null && t.consumers > 0) {
      typeBreakdown.consumers! += Number(t.consumers) > 1 ? Math.floor(Number(t.consumers)) : Math.floor(rowQty);
    }
  }

  const parent = await ParentMasterModel.findBySku(sku);
  if (!parent?._id || !isBaseParent(parent)) return;

  // Store exact integer quantities, not fractions
  const typeBreakdownIntegers: PurchaseTypeBreakdown = {
    listing: Math.floor(Number(typeBreakdown.listing) || 0),
    revival: Math.floor(Number(typeBreakdown.revival) || 0),
    growth: Math.floor(Number(typeBreakdown.growth) || 0),
    consumers: Math.floor(Number(typeBreakdown.consumers) || 0),
  };

  await ParentMasterModel.update(parent._id, {
    typeBreakdown: typeBreakdownIntegers,
    inventory_quantity: Math.floor(Number(listingQuantity) || 0),
  });
}
