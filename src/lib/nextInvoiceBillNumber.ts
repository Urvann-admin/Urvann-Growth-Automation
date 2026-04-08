import { SkuCounterModel } from '@/models/skuCounter';
import { PurchaseMasterModel } from '@/models/purchaseMaster';

const COUNTER_KEY = 'invoiceBillSequence';

/**
 * Next sequential bill number as a string ("1", "2", …). Persists in `skuCounters`.
 * Seeds from existing numeric bills in `purchaseMaster` the first time so we do not collide.
 */
export async function getNextInvoiceBillNumber(): Promise<string> {
  const cur = await SkuCounterModel.getCurrentCounter(COUNTER_KEY);
  if (cur === 0) {
    const maxFromDb = await PurchaseMasterModel.maxNumericBillNumber();
    if (maxFromDb > 0) {
      await SkuCounterModel.resetCounter(COUNTER_KEY, maxFromDb);
    }
  }
  const n = await SkuCounterModel.getNextCounter(COUNTER_KEY, 0);
  return String(n);
}
