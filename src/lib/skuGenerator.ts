import { HUB_MAPPINGS } from '@/shared/constants/hubs';
import { SkuCounterModel } from '@/models/skuCounter';

export class SkuGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkuGenerationError';
  }
}

function getHubCode(hub: string): string {
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

function calculateChecksum(sku: string): string {
  let sum = 0;
  for (let i = 0; i < sku.length; i++) {
    const char = sku[i];
    if (char >= '0' && char <= '9') {
      sum += parseInt(char, 10) * (i + 1);
    } else {
      sum += char.charCodeAt(0) * (i + 1);
    }
  }
  return (sum % 10).toString();
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
  
  const baseSku = `${hubCode}${productCode}${sequence}${qtyCode}`;
  const checksum = calculateChecksum(baseSku);
  
  return `${baseSku}${checksum}`;
}

/** Parent products are always single unit; qty code in SKU is always "01" (not set/case). */
const PARENT_QTY_CODE = '01';

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
