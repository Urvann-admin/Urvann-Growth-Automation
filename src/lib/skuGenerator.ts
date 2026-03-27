import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { SkuCounterModel } from '@/models/skuCounter';

export class SkuGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkuGenerationError';
  }
}

/** Single-letter hub code used on listing SKUs and hub-qualified parent SKUs (first word of hub name). */
export function getHubCode(hub: string): string {
  const normalized = hub.trim();
  
  const hubMapping = HUB_MAPPINGS.find(
    (m) => m.hub.toLowerCase() === normalized.toLowerCase()
  );

  if (!hubMapping) {
    throw new SkuGenerationError(`Invalid hub: "${hub}". Hub not found in HUB_MAPPINGS.`);
  }

  const firstWord = hubMapping.hub.split(/\s+/)[0];
  return firstWord.charAt(0).toUpperCase();
}

function getProductCode(productName: string): string {
  const normalized = productName.trim();
  
  if (!normalized) {
    throw new SkuGenerationError('Product name cannot be empty');
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  
  if (words.length === 0) {
    throw new SkuGenerationError('Product name must contain at least one word');
  }

  // First 3 letters: take from first word, then second word if needed, uppercase
  const letters = words.join('').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (letters.length === 0) throw new SkuGenerationError('Product name must contain at least one letter');
  return letters.slice(0, 3).padEnd(3, 'X');
}

function getPaddedSequence(counter: number): string {
  if (counter < 0 || counter > 9999) {
    throw new SkuGenerationError('Counter must be between 0 and 9999');
  }
  return counter.toString().padStart(4, '0');
}

function getQtyCode(quantity: number): string {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new SkuGenerationError('Quantity must be an integer between 1 and 99');
  }
  return quantity.toString().padStart(2, '0');
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

export async function generateSKU(
  hub: string,
  productName: string,
  quantity: number = 1
): Promise<string> {
  const hubCode = getHubCode(hub);
  const productCode = getProductCode(productName);
  const counter = await SkuCounterModel.getNextCounter(hub);
  const sequence = getPaddedSequence(counter);
  const qtyCode = getQtyCode(quantity);
  return `${hubCode}${productCode}${sequence}${qtyCode}`;
}

/** Parent products are always single unit; qty code in SKU is always "01" (not set/case). */
const PARENT_QTY_CODE = '01';

/** Counter key for parent products that are live in all hubs (no hub letter in SKU). */
const PARENT_GLOBAL_HUB_KEY = 'PARENT';

export async function generateParentSKU(
  hub: string,
  productName: string
): Promise<string> {
  const hubCode = getHubCode(hub);
  const productCode = getProductCode(productName);
  const counter = await SkuCounterModel.getNextCounter(hub);
  const sequence = getPaddedSequence(counter);
  return `${hubCode}${productCode}${sequence}${PARENT_QTY_CODE}`;
}

/**
 * Generate a single parent SKU without hub letter (for parents live in all hubs).
 * Format: [PRODUCT][SEQUENCE][01] e.g. ROS0001001
 */
export async function generateParentSKUGlobal(productName: string): Promise<string> {
  const productCode = getProductCode(productName);
  const counter = await SkuCounterModel.getNextCounter(PARENT_GLOBAL_HUB_KEY);
  const sequence = getPaddedSequence(counter);
  return `${productCode}${sequence}${PARENT_QTY_CODE}`;
}

/** Preview next global parent SKU without incrementing counter. */
export async function previewParentSKUGlobal(productName: string): Promise<string> {
  const productCode = getProductCode(productName);
  const currentCounter = await SkuCounterModel.getCurrentCounter(PARENT_GLOBAL_HUB_KEY);
  const nextCounter = currentCounter + 1;
  const sequence = getPaddedSequence(nextCounter);
  return `${productCode}${sequence}${PARENT_QTY_CODE}`;
}

/**
 * Returns what the next parent SKU would be, without incrementing the counter.
 * Parent qty code is always "01" (single). For UI preview only.
 */
export async function previewParentSKU(
  hub: string,
  productName: string
): Promise<string> {
  const hubCode = getHubCode(hub);
  const productCode = getProductCode(productName);
  const currentCounter = await getCurrentCounterForHub(hub); // read-only, no increment
  const nextCounter = currentCounter + 1;
  const sequence = getPaddedSequence(nextCounter);
  return `${hubCode}${productCode}${sequence}${PARENT_QTY_CODE}`;
}

/**
 * Returns what the next listing SKU would be, without incrementing the counter.
 * For UI preview only (hub, plant, setQuantity).
 */
export async function previewListingSKU(
  hub: string,
  productName: string,
  quantity: number = 1
): Promise<string> {
  const hubCode = getHubCode(hub);
  const productCode = getProductCode(productName);
  const currentCounter = await getCurrentCounterForHub(hub);
  const nextCounter = currentCounter + 1;
  const sequence = getPaddedSequence(nextCounter);
  const qtyCode = getQtyCode(quantity);
  return `${hubCode}${productCode}${sequence}${qtyCode}`;
}

export function validateHub(hub: string): boolean {
  return HUB_MAPPINGS.some(
    (m) => m.hub.toLowerCase() === hub.trim().toLowerCase()
  );
}

export async function getCurrentCounterForHub(hub: string): Promise<number> {
  if (!validateHub(hub)) {
    throw new SkuGenerationError(`Invalid hub: "${hub}"`);
  }
  return SkuCounterModel.getCurrentCounter(hub);
}

export async function getAllHubCounters(): Promise<Record<string, number>> {
  const counters = await SkuCounterModel.getAllCounters();
  const result: Record<string, number> = {};
  
  for (const mapping of HUB_MAPPINGS) {
    const counter = counters.find((c) => c.hub === mapping.hub);
    result[mapping.hub] = counter?.counter ?? 0;
  }
  
  return result;
}
