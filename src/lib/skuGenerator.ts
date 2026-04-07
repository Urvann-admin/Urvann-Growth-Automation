import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { SkuCounterModel } from '@/models/skuCounter';
import {
  SkuGenerationError,
  getHubCode,
  canonicalHubNameForSkuCounter,
  validateHub,
} from '@/lib/skuParentCanon';

/** Re-export hub/parent canon helpers (no DB) for existing `@/lib/skuGenerator` imports. */
export * from '@/lib/skuParentCanon';

const COUNTER_KEY_SEP = '|';

/**
 * Sequence is allocated per (hub, product code) so different hubs can reuse the same 4-digit
 * suffix (e.g. WTES0001 and NTES0001). Parent and listing generation share one bucket for a
 * given hub + product so qty-01 listing SKUs cannot collide with parent SKUs.
 */
function hubProductCounterKey(canonicalHub: string, productCode: string): string {
  return `u${COUNTER_KEY_SEP}${canonicalHub}${COUNTER_KEY_SEP}${productCode}`;
}

/** Global parent SKUs (no hub letter): sequence per product code only. */
function globalParentCounterKey(productCode: string): string {
  return `g${COUNTER_KEY_SEP}GLOBAL${COUNTER_KEY_SEP}${productCode}`;
}

/** Legacy single counter for all global parents (used only to seed per-product global buckets). */
const PARENT_GLOBAL_HUB_KEY = 'PARENT';

/** When a new per-(hub, product) bucket is created, start after legacy hub counter and sibling buckets. */
async function seedFloorForNewHubProductBucket(canonicalHub: string): Promise<number> {
  const legacy = await SkuCounterModel.getCurrentCounter(canonicalHub);
  const all = await SkuCounterModel.getAllCounters();
  const prefix = `u${COUNTER_KEY_SEP}${canonicalHub}${COUNTER_KEY_SEP}`;
  const fromBuckets = all.filter((c) => c.hub.startsWith(prefix)).map((c) => c.counter ?? 0);
  return Math.max(legacy, fromBuckets.length > 0 ? Math.max(...fromBuckets) : 0, 0);
}

async function bumpHubProductSequence(canonicalHub: string, productCode: string): Promise<number> {
  const key = hubProductCounterKey(canonicalHub, productCode);
  const cur = await SkuCounterModel.getCurrentCounter(key);
  const floor = cur > 0 ? 0 : await seedFloorForNewHubProductBucket(canonicalHub);
  return SkuCounterModel.getNextCounter(key, floor);
}

async function bumpGlobalParentSequence(productCode: string): Promise<number> {
  const key = globalParentCounterKey(productCode);
  const cur = await SkuCounterModel.getCurrentCounter(key);
  if (cur > 0) return SkuCounterModel.getNextCounter(key, 0);
  const legacy = await SkuCounterModel.getCurrentCounter(PARENT_GLOBAL_HUB_KEY);
  return SkuCounterModel.getNextCounter(key, legacy);
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

export async function generateSKU(
  hub: string,
  productName: string,
  quantity: number = 1
): Promise<string> {
  const canonicalHub = canonicalHubNameForSkuCounter(hub);
  const hubCode = getHubCode(canonicalHub);
  const productCode = getProductCode(productName);
  const counter = await bumpHubProductSequence(canonicalHub, productCode);
  const sequence = getPaddedSequence(counter);
  const qtyCode = getQtyCode(quantity);
  return `${hubCode}${productCode}${sequence}${qtyCode}`;
}

/** Parent products are always single unit; qty code in SKU is always "01" (not set/case). */
const PARENT_QTY_CODE = '01';

export async function generateParentSKU(
  hub: string,
  productName: string
): Promise<string> {
  const canonicalHub = canonicalHubNameForSkuCounter(hub);
  const hubCode = getHubCode(canonicalHub);
  const productCode = getProductCode(productName);
  const counter = await bumpHubProductSequence(canonicalHub, productCode);
  const sequence = getPaddedSequence(counter);
  return `${hubCode}${productCode}${sequence}${PARENT_QTY_CODE}`;
}

/**
 * Allocates **one** sequence number shared across all hubs in the batch so that
 * every hub gets the same base_sku (e.g. ROS000101 for Whitefield → WROS000101
 * and Nagarbhavi → NROS000101).
 *
 * Strategy:
 *  1. Find the highest current counter across all hubs in the batch.
 *  2. Bump once from that floor — atomically on the first hub's bucket.
 *  3. Write the same sequence into every other hub bucket (no further bump).
 */
export async function generateParentSKUForHubs(
  hubs: string[],
  productName: string
): Promise<Map<string, string>> {
  if (hubs.length === 0) return new Map();

  const productCode = getProductCode(productName);

  let floor = 0;
  const canonicalHubs = hubs.map((h) => canonicalHubNameForSkuCounter(h));
  for (const ch of canonicalHubs) {
    const cur = await SkuCounterModel.getCurrentCounter(hubProductCounterKey(ch, productCode));
    if (cur > floor) floor = cur;
    const legacy = await SkuCounterModel.getCurrentCounter(ch);
    if (legacy > floor) floor = legacy;
  }

  const firstCanonical = canonicalHubs[0]!;
  const firstKey = hubProductCounterKey(firstCanonical, productCode);
  const sharedSeq = await SkuCounterModel.getNextCounter(firstKey, floor);
  const sequence = getPaddedSequence(sharedSeq);

  for (let i = 1; i < canonicalHubs.length; i++) {
    const key = hubProductCounterKey(canonicalHubs[i]!, productCode);
    await SkuCounterModel.resetCounter(key, sharedSeq);
  }

  const result = new Map<string, string>();
  for (let i = 0; i < hubs.length; i++) {
    const hubCode = getHubCode(canonicalHubs[i]!);
    result.set(hubs[i]!, `${hubCode}${productCode}${sequence}${PARENT_QTY_CODE}`);
  }
  return result;
}

/**
 * Generate a single parent SKU without hub letter (for parents live in all hubs).
 * Format: [PRODUCT][SEQUENCE][01] e.g. ROS0001001
 */
export async function generateParentSKUGlobal(productName: string): Promise<string> {
  const productCode = getProductCode(productName);
  const counter = await bumpGlobalParentSequence(productCode);
  const sequence = getPaddedSequence(counter);
  return `${productCode}${sequence}${PARENT_QTY_CODE}`;
}

/** Preview next global parent SKU without incrementing counter. */
export async function previewParentSKUGlobal(productName: string): Promise<string> {
  const productCode = getProductCode(productName);
  const legacy = await SkuCounterModel.getCurrentCounter(PARENT_GLOBAL_HUB_KEY);
  const scoped = await SkuCounterModel.getCurrentCounter(globalParentCounterKey(productCode));
  const currentCounter = Math.max(legacy, scoped);
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
  const canonicalHub = canonicalHubNameForSkuCounter(hub);
  const hubCode = getHubCode(canonicalHub);
  const productCode = getProductCode(productName);
  const currentCounter = await getCurrentCounterForHubProduct(canonicalHub, productCode);
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
  const canonicalHub = canonicalHubNameForSkuCounter(hub);
  const hubCode = getHubCode(canonicalHub);
  const productCode = getProductCode(productName);
  const currentCounter = await getCurrentCounterForHubProduct(canonicalHub, productCode);
  const nextCounter = currentCounter + 1;
  const sequence = getPaddedSequence(nextCounter);
  const qtyCode = getQtyCode(quantity);
  return `${hubCode}${productCode}${sequence}${qtyCode}`;
}

/** Max of legacy per-hub counter and per-(hub, product) bucket (read-only). */
export async function getCurrentCounterForHubProduct(
  canonicalHub: string,
  productCode: string
): Promise<number> {
  const legacy = await SkuCounterModel.getCurrentCounter(canonicalHub);
  const scoped = await SkuCounterModel.getCurrentCounter(hubProductCounterKey(canonicalHub, productCode));
  return Math.max(legacy, scoped);
}

export async function getCurrentCounterForHub(hub: string): Promise<number> {
  if (!validateHub(hub)) {
    throw new SkuGenerationError(`Invalid hub: "${hub}"`);
  }
  const canonicalHub = canonicalHubNameForSkuCounter(hub);
  const counters = await SkuCounterModel.getAllCounters();
  const legacy = counters.find((c) => c.hub === canonicalHub)?.counter ?? 0;
  const fromBuckets = counters
    .filter((c) => c.hub.startsWith(`u${COUNTER_KEY_SEP}${canonicalHub}${COUNTER_KEY_SEP}`))
    .map((c) => c.counter ?? 0);
  const bucketMax = fromBuckets.length > 0 ? Math.max(...fromBuckets) : 0;
  return Math.max(legacy, bucketMax);
}

export async function getAllHubCounters(): Promise<Record<string, number>> {
  const counters = await SkuCounterModel.getAllCounters();
  const result: Record<string, number> = {};

  for (const mapping of HUB_MAPPINGS) {
    const h = mapping.hub;
    const legacy = counters.find((c) => c.hub === h)?.counter ?? 0;
    const fromBuckets = counters
      .filter((c) => c.hub.startsWith(`u${COUNTER_KEY_SEP}${h}${COUNTER_KEY_SEP}`))
      .map((c) => c.counter ?? 0);
    const bucketMax = fromBuckets.length > 0 ? Math.max(...fromBuckets) : 0;
    result[h] = Math.max(legacy, bucketMax);
  }

  return result;
}
