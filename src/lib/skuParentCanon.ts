/**
 * Hub / parent-SKU normalization only (no DB). Safe to import from Client Components.
 */
import { HUB_MAPPINGS } from '@/shared/constants/hubs';

export class SkuGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkuGenerationError';
  }
}

/** Single-letter hub code used on listing SKUs and hub-qualified parent SKUs (first word of hub name). */
export function getHubCode(hub: string): string {
  const normalized = hub.trim();

  const hubMapping = HUB_MAPPINGS.find((m) => m.hub.toLowerCase() === normalized.toLowerCase());

  if (!hubMapping) {
    throw new SkuGenerationError(`Invalid hub: "${hub}". Hub not found in HUB_MAPPINGS.`);
  }

  const firstWord = hubMapping.hub.split(/\s+/)[0];
  return firstWord.charAt(0).toUpperCase();
}

/**
 * Canonical hub name from HUB_MAPPINGS (case-insensitive).
 * Ensures skuCounters always use one document per real hub (e.g. not both "whitefield" and "Whitefield").
 */
export function canonicalHubNameForSkuCounter(hub: string): string {
  const t = hub.trim();
  const m = HUB_MAPPINGS.find((x) => x.hub.toLowerCase() === t.toLowerCase());
  if (!m) {
    throw new SkuGenerationError(`Invalid hub: "${hub}". Hub not found in HUB_MAPPINGS.`);
  }
  return m.hub;
}

/**
 * Parent listings: persist `parentItems[].parentSku` as hub letter + base parent SKU from Parent Master
 * (e.g. Whitefield + TES000501 → WTES000501). Always prepends the hub letter even when the base
 * already starts with that letter (e.g. Thanissandra T + TES000701 → TTES000701).
 */
export function appendHubLetterToParentSku(hub: string, canonicalParentSku: string): string {
  const base = String(canonicalParentSku ?? '').trim();
  if (!base) return base;
  const code = getHubCode(hub);
  return `${code}${base}`;
}

/**
 * Parent Master row is hub-scoped when `parentHubField` matches `hub` and `skuFromParent` already starts
 * with that hub letter (e.g. Whitefield + WTES000501). Then use as-is on listing lines.
 * Otherwise treat `skuFromParent` as global / canonical and prepend hub letter (legacy one-parent-all-hubs).
 */
export function parentListingLineParentSku(
  hub: string,
  skuFromParent: string,
  parentHubField: string | undefined
): string {
  const base = String(skuFromParent ?? '').trim();
  if (!base) return base;
  const h = hub.trim();
  if (!h) return base;
  try {
    const code = getHubCode(h);
    const ph = String(parentHubField ?? '').trim();
    if (ph.toLowerCase() === h.toLowerCase() && base.startsWith(code) && base.length > code.length) {
      return base;
    }
  } catch {
    /* fall through */
  }
  return appendHubLetterToParentSku(h, base);
}

/**
 * Maps stored parent listing `parentSku` back to Parent Master / purchase key (strip hub letter when it matches this listing's hub).
 */
export function toCanonicalParentSkuForPurchases(
  listingType: 'parent' | 'child' | undefined,
  hub: string | undefined,
  storedParentSku: string
): string {
  const s = String(storedParentSku ?? '').trim();
  /** Parent and child listings may persist hub letter + base SKU on parent lines when `hub` is set. */
  if ((listingType !== 'parent' && listingType !== 'child') || !hub?.trim()) return s;
  try {
    const code = getHubCode(hub);
    if (s.startsWith(code) && s.length > code.length) return s.slice(code.length);
  } catch {
    /* invalid hub */
  }
  return s;
}

/**
 * Parent Master `base_sku`: SKU without the hub letter.
 * - Hub-scoped row (`hub` set): strip this hub’s letter from `sku` when it matches (e.g. WTES000501 → TES000501).
 * - Global row (no `hub`): `sku` is already the base — returned as-is.
 */
export function baseSkuForParentMasterRow(sku: string, hub: string | undefined): string {
  const s = String(sku ?? '').trim();
  if (!s) return '';
  const h = String(hub ?? '').trim();
  if (!h) return s;
  return toCanonicalParentSkuForPurchases('parent', h, s);
}

/**
 * For parent-type listings, `parentItems[0].parentSku` may be hub-prefixed. Collect possible
 * base Parent Master SKUs so `findBySku` succeeds even if stored `hub` mismatches the prefix.
 */
export function candidateBaseParentSkusForParentListing(
  storedParentSku: string,
  hub?: string
): string[] {
  const r = String(storedParentSku ?? '').trim();
  if (!r) return [];
  const out: string[] = [];
  out.push(toCanonicalParentSkuForPurchases('parent', hub, r));
  out.push(r);
  for (const mapping of HUB_MAPPINGS) {
    try {
      const code = getHubCode(mapping.hub);
      if (r.startsWith(code) && r.length > code.length) {
        out.push(r.slice(code.length));
      }
    } catch {
      /* skip invalid mapping */
    }
  }
  return [...new Set(out.filter(Boolean))];
}

export function validateHub(hub: string): boolean {
  return HUB_MAPPINGS.some((m) => m.hub.toLowerCase() === hub.trim().toLowerCase());
}
