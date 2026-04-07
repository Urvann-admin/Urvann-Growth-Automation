/**
 * Pure helpers for growing-product `productCode` shape:
 * 3 letters (name) + 2 letters (vendor) + 2 letters (base parent SKU) + 4-digit sequence.
 */

export class GrowingProductCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GrowingProductCodeError';
  }
}

/** Strip non-alphanumeric, uppercase, take first `length` chars, pad with `pad` on the right. */
export function takeLeadingAlphaNumeric(
  source: string,
  length: number,
  pad: string = 'X'
): string {
  const letters = String(source ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  if (letters.length === 0) {
    return pad.repeat(length).slice(0, length);
  }
  const chunk = letters.slice(0, length);
  return chunk.length >= length ? chunk : chunk + pad.repeat(length - chunk.length);
}

/** Seven-character prefix before the 4-digit sequence. */
export function growingProductCodePrefix(
  plant: string,
  vendorDisplayName: string,
  baseParentSku: string
): string {
  const namePart = takeLeadingAlphaNumeric(plant, 3);
  const vendorPart = takeLeadingAlphaNumeric(vendorDisplayName, 2);
  const skuPart = takeLeadingAlphaNumeric(baseParentSku, 2);
  return `${namePart}${vendorPart}${skuPart}`;
}

export function formatGrowingProductSequence(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9999) {
    throw new GrowingProductCodeError('Sequence must be an integer from 1 to 9999');
  }
  return n.toString().padStart(4, '0');
}
