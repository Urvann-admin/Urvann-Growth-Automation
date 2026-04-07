import { SkuCounterModel } from '@/models/skuCounter';
import { ParentMasterModel } from '@/models/parentMaster';
import {
  GrowingProductCodeError,
  growingProductCodePrefix,
  formatGrowingProductSequence,
} from '@/lib/growingProductCode';

const COUNTER_KEY_PREFIX = 'growingPc';

export function growingProductCounterHubKey(codePrefix7: string): string {
  return `${COUNTER_KEY_PREFIX}|${codePrefix7}`;
}

export async function peekNextGrowingProductCode(params: {
  plant: string;
  vendorName: string;
  parentSku: string;
}): Promise<{ prefix: string; productCodePreview: string }> {
  const prefix = growingProductCodePrefix(params.plant, params.vendorName, params.parentSku);
  const key = growingProductCounterHubKey(prefix);
  const maxDb = await ParentMasterModel.maxNumericSuffixForGrowingCodePrefix(prefix);
  const cur = await SkuCounterModel.getCurrentCounter(key);
  const next = Math.max(maxDb, cur) + 1;
  if (next > 9999) {
    throw new GrowingProductCodeError(
      'Growing product code sequence exceeded 9999 for this prefix; contact engineering.'
    );
  }
  return { prefix, productCodePreview: prefix + formatGrowingProductSequence(next) };
}

/**
 * Atomically allocates the next code for this prefix, staying in sync with any existing
 * `parentMaster.productCode` rows that match `prefix` + 4 digits.
 */
export async function allocateGrowingProductCode(params: {
  plant: string;
  vendorName: string;
  parentSku: string;
}): Promise<string> {
  const prefix = growingProductCodePrefix(params.plant, params.vendorName, params.parentSku);
  const key = growingProductCounterHubKey(prefix);
  const maxDb = await ParentMasterModel.maxNumericSuffixForGrowingCodePrefix(prefix);
  const cur = await SkuCounterModel.getCurrentCounter(key);
  const floor = Math.max(maxDb, cur);
  if (floor > cur) {
    await SkuCounterModel.resetCounter(key, floor);
  }
  const seq = await SkuCounterModel.getNextCounter(key, 0);
  if (seq > 9999) {
    throw new GrowingProductCodeError(
      'Growing product code sequence exceeded 9999 for this prefix; contact engineering.'
    );
  }
  return prefix + formatGrowingProductSequence(seq);
}
