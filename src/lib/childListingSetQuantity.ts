import type { ParentMaster } from '@/models/parentMaster';

/** Lines that contribute to child listing set quantity (same shape as parent picker rows). */
export type ParentLineForSetQty = {
  parent?: ParentMaster;
  quantity?: number;
};

/**
 * Merchandising kind for set-qty rules. Legacy rows without `parentKind` are treated as plants.
 */
export function parentMerchandisingKind(parent: ParentMaster | undefined): 'plant' | 'pot' {
  if (!parent) return 'plant';
  return parent.parentKind === 'pot' ? 'pot' : 'plant';
}

/**
 * Child listing set quantity:
 * - If any selected line is a plant, sum quantities on **plant** lines only (pots in the same set are excluded).
 * - If every line is a pot, sum quantities on **pot** lines only.
 * - Minimum 1 when there are no countable lines.
 */
export function childListingSetQuantityFromParentItems(items: ParentLineForSetQty[]): number {
  const lines = items.filter((i) => i.parent && (i.quantity ?? 0) > 0);
  if (lines.length === 0) return 1;

  const hasPlant = lines.some((i) => parentMerchandisingKind(i.parent) === 'plant');
  const kind: 'plant' | 'pot' = hasPlant ? 'plant' : 'pot';
  const sum = lines
    .filter((i) => parentMerchandisingKind(i.parent) === kind)
    .reduce((s, i) => s + (i.quantity ?? 0), 0);

  return sum > 0 ? sum : 1;
}
