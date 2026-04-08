import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { getHubCode } from '@/lib/skuParentCanon';

/**
 * If exactly one hub’s listing letter matches the first character of `sku`, return that hub.
 * Returns null when ambiguous (e.g. two hubs share the same letter) or no match.
 */
export function hubFromSkuFirstLetter(sku: string): string | null {
  const s = String(sku ?? '').trim();
  if (!s) return null;
  const letter = s.charAt(0).toUpperCase();
  const matches: string[] = [];
  for (const m of HUB_MAPPINGS) {
    try {
      if (getHubCode(m.hub) === letter) matches.push(m.hub);
    } catch {
      /* skip */
    }
  }
  if (matches.length === 1) return matches[0]!;
  return null;
}

/** Prefer stored `hub` on the parent row; otherwise a single unambiguous match from SKU prefix. */
export function inferHubFromParentRecord(p: { hub?: string; sku?: string }): string | null {
  const fromDoc = String(p.hub ?? '').trim();
  if (fromDoc) return fromDoc;
  return hubFromSkuFirstLetter(String(p.sku ?? ''));
}
