import type { ParentMaster } from '@/models/parentMaster';

/** Parent line shape used when deriving listing price on the child listing form. */
export type ParentLineForListingPrice = {
  parent?: ParentMaster;
  quantity?: number;
  unitPrice?: number;
};

/**
 * Listing selling price from selected parent lines (same rule as ProductTable recalculatePriceAndInventory).
 */
export function calculatedListingPriceFromParentItems(items: ParentLineForListingPrice[]): number {
  let totalPrice = 0;
  for (const item of items) {
    const parent = item.parent;
    if (!parent || !item.quantity) continue;
    totalPrice += (item.unitPrice || parent.price || 0) * item.quantity;
  }
  return totalPrice;
}

/** Max listable sets from parent inventory (same rule as ProductTable recalculatePriceAndInventory). */
export function listingInventoryFromParentItems(items: ParentLineForListingPrice[]): number {
  let minInventory = Infinity;
  for (const item of items) {
    const parent = item.parent;
    if (!parent || !item.quantity) continue;
    const possibleSets = Math.floor((parent.inventory_quantity ?? 0) / item.quantity);
    minInventory = Math.min(minInventory, possibleSets);
  }
  return minInventory === Infinity ? 0 : minInventory;
}

/**
 * Child listing: compare-at = calculated listing price (from parent lines) × 4.
 */
export function compareAtFromCalculatedChildListingPrice(price: number): number | undefined {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return undefined;
  return price * 4;
}
