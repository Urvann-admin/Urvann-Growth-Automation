/**
 * Shared "full product name" for SEO and display: plant + attributes (same rules as Product Master final name).
 */
export type ProductDisplayNameParts = {
  plant: string;
  otherNames?: string;
  variety?: string;
  colour?: string;
  height?: number | '';
  size?: number | '';
  /** Product Master: pot type option value */
  potType?: string;
  /** Listing row / parent: pot type (often same meaning as potType) */
  type?: string;
  mossStick?: string;
};

export function computeProductDisplayName(p: ProductDisplayNameParts): string {
  const parts: string[] = [];
  if (p.plant?.trim()) parts.push(p.plant.trim());
  if (p.otherNames?.trim()) parts.push(p.otherNames.trim());
  if (p.variety?.trim()) parts.push(p.variety.trim());
  if (p.colour?.trim()) parts.push(p.colour.trim());
  if (p.height !== '' && p.height !== undefined && !Number.isNaN(Number(p.height))) {
    parts.push(String(p.height), 'ft');
  }
  if (p.size !== '' && p.size !== undefined) {
    parts.push('in', String(p.size), 'inch');
  }
  const pot = (p.potType?.trim() || p.type?.trim()) ?? '';
  if (pot) parts.push(pot);
  if (p.mossStick?.trim()) parts.push(p.mossStick.trim());
  return parts.join(' ');
}
