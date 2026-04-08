import type { ParentMaster } from '@/models/parentMaster';

export type RowSliceForAutoProductName = {
  parentItems: Array<{ parent?: ParentMaster }>;
  size: number | '';
  type: string;
  setQuantity?: number;
};

/**
 * Child listing: storefront-style name from parent line(s), pot size, type, and set quantity.
 * Does not use `row.plant` — used to auto-fill / suggest the editable product name.
 */
export function buildChildListingAutoProductName(row: RowSliceForAutoProductName): string {
  const parentNames = row.parentItems
    .filter((item) => item.parent)
    .map((item) => {
      const name = String((item.parent!.finalName || item.parent!.plant || '').trim());
      const idx = name.toLowerCase().indexOf(' in ');
      return idx >= 0 ? name.slice(0, idx).trim() : name;
    })
    .filter(Boolean);
  const size = typeof row.size === 'number' ? row.size : Number(row.size);
  const setQty = row.setQuantity ?? 1;
  if (parentNames.length === 0) return '—';

  const parts = [parentNames.length === 1 ? parentNames[0]! : parentNames.join(' & ')];
  if (size) parts.push(`in ${size} inch`);
  if (row.type) parts.push(row.type);
  const base = parts.join(' ');
  if (setQty > 1) return `Set of ${setQty} ${base}`;
  return base;
}
