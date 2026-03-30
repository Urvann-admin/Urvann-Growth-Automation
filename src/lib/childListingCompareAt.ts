import type { ParentMaster } from '@/models/parentMaster';

/**
 * Child listing: compare-at from the first parent line (primary parent).
 * Uses Parent Master `compare_at` when set; otherwise same default as parent form (selling × 4).
 */
export function compareAtFromFirstParentLine(items: { parent?: ParentMaster }[]): number | undefined {
  return compareAtFromParentMaster(items[0]?.parent);
}

export function compareAtFromParentMaster(parent: ParentMaster | undefined): number | undefined {
  if (!parent) return undefined;
  const ca = parent.compare_at;
  if (typeof ca === 'number' && Number.isFinite(ca) && ca >= 0) return ca;
  const sp = parent.sellingPrice ?? parent.price;
  if (typeof sp === 'number' && Number.isFinite(sp) && sp >= 0) return sp * 4;
  return undefined;
}
