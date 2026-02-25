export interface PotTypeConfig {
  value: string;
  label: string;
  /** Base price per pot for this type/size bucket */
  basePrice: number;
  /** Optional maximum size (inclusive) this price applies to. If omitted, works as fallback. */
  maxSizeInch?: number;
}

/**
 * Simple pot pricing matrix.
 * This is intentionally coarse‑grained – we just need predictable buckets
 * that are shared between frontend and backend.
 */
export const POT_TYPES_WITH_PRICING: PotTypeConfig[] = [
  // Nursery pots
  { value: 'Black Nursery Pot', label: 'Black Nursery Pot (≤4")', basePrice: 5, maxSizeInch: 4 },
  { value: 'Black Nursery Pot', label: 'Black Nursery Pot (≤6")', basePrice: 8, maxSizeInch: 6 },
  { value: 'Black Nursery Pot', label: 'Black Nursery Pot (≤8")', basePrice: 12, maxSizeInch: 8 },
  { value: 'Black Nursery Pot', label: 'Black Nursery Pot (large)', basePrice: 15 },

  { value: 'Nursery Pot', label: 'Nursery Pot', basePrice: 10 },
  { value: 'White Nursery Pot', label: 'White Nursery Pot', basePrice: 12 },
  { value: 'Nursery Bag', label: 'Nursery Bag', basePrice: 4 },

  // Hanging
  { value: 'Hanging Basket', label: 'Hanging Basket', basePrice: 20 },
  { value: 'Hanging Pot', label: 'Hanging Pot', basePrice: 18 },

  // Others
  { value: 'Glass Bowl', label: 'Glass Bowl', basePrice: 30 },
  { value: 'Black Square Nursery Pot', label: 'Black Square Nursery Pot', basePrice: 14 },
  { value: 'Black Super Nursery Pot', label: 'Black Super Nursery Pot', basePrice: 16 },
];

export function getPotPrice(potType?: string, potSize?: number): number {
  if (!potType || !potSize) return 0;

  const normalizedType = potType.trim().toLowerCase();
  const candidates = POT_TYPES_WITH_PRICING.filter(
    (cfg) => cfg.value.toLowerCase() === normalizedType
  );

  if (candidates.length === 0) {
    return 0;
  }

  // Prefer the smallest bucket that still fits the size
  const withMax = candidates
    .filter((cfg) => typeof cfg.maxSizeInch === 'number')
    .sort((a, b) => (a.maxSizeInch! - b.maxSizeInch!));

  for (const cfg of withMax) {
    if (potSize <= cfg.maxSizeInch!) {
      return cfg.basePrice;
    }
  }

  // Fallback: any config without maxSize or the first candidate
  const fallback = candidates.find((cfg) => cfg.maxSizeInch == null) ?? candidates[0];
  return fallback.basePrice;
}

