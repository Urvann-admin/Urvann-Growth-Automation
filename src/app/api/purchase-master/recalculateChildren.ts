import { ListingProductModel } from '@/models/listingProduct';
import { ListingNotificationModel } from '@/models/listingNotification';
import { ParentMasterModel } from '@/models/parentMaster';

/**
 * After a parent's inventory_quantity changes (via invoice addition), find all
 * listing-product children that reference that parent, recalculate their
 * inventory, and persist the update.
 *
 * Children whose publish_status is already 0 (unpublished) will have their
 * inventory recalculated but their publish_status will NOT be flipped to 1.
 * A notification is stored so the listing page can surface them.
 */
export async function recalculateListingChildrenInventory(
  parentSkus: string[]
): Promise<{ recalculated: number; unpublishedSkus: string[] }> {
  if (!parentSkus.length) return { recalculated: 0, unpublishedSkus: [] };

  const children = await ListingProductModel.findByParentSkus(parentSkus);

  const listedChildren = children.filter(
    (c) => c.status === 'listed' || c.status === 'published'
  );

  if (!listedChildren.length) return { recalculated: 0, unpublishedSkus: [] };

  const allParentSkusNeeded = new Set<string>();
  for (const child of listedChildren) {
    for (const item of child.parentItems ?? []) {
      allParentSkusNeeded.add(item.parentSku);
    }
  }

  const parentDocs = await Promise.all(
    Array.from(allParentSkusNeeded).map((sku) => ParentMasterModel.findBySku(sku))
  );
  const parentInventoryMap = new Map<string, number>();
  for (const doc of parentDocs) {
    if (doc?.sku) {
      parentInventoryMap.set(doc.sku, doc.inventory_quantity ?? 0);
    }
  }

  let recalculated = 0;
  const unpublishedSkus: string[] = [];
  const unpublishedListingIds: string[] = [];

  for (const child of listedChildren) {
    const items = child.parentItems ?? [];
    if (!items.length) continue;

    let minSets = Infinity;
    for (const item of items) {
      const available = parentInventoryMap.get(item.parentSku) ?? 0;
      const sets = item.quantity > 0 ? Math.floor(available / item.quantity) : 0;
      minSets = Math.min(minSets, sets);
    }
    const newInventory = minSets === Infinity ? 0 : minSets;

    const wasUnpublished = child.publish_status === 0;
    const updatePayload: Record<string, unknown> = {
      inventory_quantity: newInventory,
    };

    if (!wasUnpublished) {
      updatePayload.publish_status = newInventory > 0 ? 1 : 0;
    }

    if (wasUnpublished && newInventory > 0) {
      unpublishedSkus.push(child.sku ?? String(child._id));
      if (child._id) unpublishedListingIds.push(String(child._id));
    }

    await ListingProductModel.update(child._id!, updatePayload as any);
    recalculated++;
  }

  if (unpublishedSkus.length > 0) {
    await ListingNotificationModel.create({
      type: 'inventory_recalculated_unpublished',
      parentSkus,
      childSkus: unpublishedSkus,
      listingProductIds: unpublishedListingIds,
      message: `Inventory recalculated for ${unpublishedSkus.length} child product(s), but they remain unpublished. Approve to publish or dismiss.`,
      read: false,
    });
  }

  return { recalculated, unpublishedSkus };
}

/**
 * Fire-and-forget webhook call to the Inventory Management system so it can
 * mirror the parent inventory delta and recalculate its own child SKUs.
 */
export async function sendInventoryWebhook(
  parentSku: string,
  inventoryDelta: number
): Promise<void> {
  const baseUrl = process.env.INVENTORY_MANAGEMENT_API_URL;
  if (!baseUrl) {
    console.warn('[purchase-master] INVENTORY_MANAGEMENT_API_URL not set; skipping webhook');
    return;
  }

  try {
    await fetch(`${baseUrl}/api/inventory-dashboard/webhook/invoice-inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentSku,
        inventoryDelta,
        source: 'invoice',
      }),
    });
  } catch (err) {
    console.error('[purchase-master] Inventory webhook failed for', parentSku, err);
  }
}
