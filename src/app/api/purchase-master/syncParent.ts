import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { PurchaseMasterModel } from '@/models/purchaseMaster';
import { ParentMasterModel } from '@/models/parentMaster';

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
    if (t?.listing != null) typeBreakdown.listing! += Number(t.listing) || 0;
    if (t?.revival != null) typeBreakdown.revival! += Number(t.revival) || 0;
    if (t?.growth != null) typeBreakdown.growth! += Number(t.growth) || 0;
    if (t?.consumers != null) typeBreakdown.consumers! += Number(t.consumers) || 0;
    if (t?.listing != null && t.listing > 0) {
      listingQuantity += Number(row.quantity) || 0;
    }
  }

  const parent = await ParentMasterModel.findBySku(sku);
  if (!parent?._id) return;

  await ParentMasterModel.update(parent._id, {
    typeBreakdown,
    inventory_quantity: listingQuantity,
  });
}
