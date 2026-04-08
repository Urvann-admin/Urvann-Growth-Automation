import type { ParentMaster, ProductType } from '@/models/parentMaster';
import { ParentMasterModel, isBaseParent } from '@/models/parentMaster';
import {
  appendHubLetterToParentSku,
  getHubCode,
  validateHub,
} from '@/lib/skuParentCanon';

export type ResolveParentSkuResult =
  | {
      success: true;
      parentSku: string;
      productType: ProductType;
      vendorId: string | undefined;
    }
  | { success: false; message: string };

function baseSkuForGrowingRow(doc: ParentMaster): string {
  const base = String(doc.base_sku ?? '').trim();
  if (base) return base;
  const sku = String(doc.sku ?? '').trim();
  if (!sku) return '';
  const h = String(doc.hub ?? '').trim();
  if (!h) return sku;
  try {
    const code = getHubCode(h);
    if (sku.startsWith(code) && sku.length > code.length) return sku.slice(code.length);
  } catch {
    /* ignore */
  }
  return sku;
}

/**
 * Resolves purchase `parentSku` from a Parent Master `productCode` and selected hub.
 * - Base parent: uses document `sku`.
 * - growing_product / consumable: hub letter + base SKU (from `base_sku` or derived from `sku` / `hub`).
 */
export async function resolveParentSkuFromCode(
  productCode: string,
  hub: string
): Promise<ResolveParentSkuResult> {
  const code = String(productCode ?? '').trim();
  if (!code) {
    return { success: false, message: 'Enter a product code.' };
  }
  const hubTrim = String(hub ?? '').trim();
  if (!hubTrim || !validateHub(hubTrim)) {
    return { success: false, message: 'Select a hub.' };
  }

  const doc = (await ParentMasterModel.findByProductCode(code)) as ParentMaster | null;
  if (!doc) {
    return {
      success: false,
      message: `Unknown product code: ${code}`,
    };
  }

  const productType: ProductType = doc.productType ?? 'parent';
  const vendorId =
    String(doc.vendorMasterId ?? '').trim() ||
    String(doc.vendor_id ?? '').trim() ||
    undefined;

  if (isBaseParent(doc)) {
    const parentSku = String(doc.sku ?? '').trim();
    if (!parentSku) {
      return {
        success: false,
        message: 'This product has no SKU in product master.',
      };
    }
    return { success: true, parentSku, productType: 'parent', vendorId };
  }

  if (productType === 'growing_product' || productType === 'consumable') {
    const base = baseSkuForGrowingRow(doc);
    if (!base) {
      return {
        success: false,
        message: 'Missing base SKU for this growing product.',
      };
    }
    let parentSku: string;
    try {
      parentSku = appendHubLetterToParentSku(hubTrim, base);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid hub for SKU';
      return { success: false, message: msg };
    }
    // Verify that the hub-combined SKU actually exists as a base parent in parentMaster
    const parentDoc = await ParentMasterModel.findBySku(parentSku);
    if (!parentDoc || !isBaseParent(parentDoc)) {
      return {
        success: false,
        message: `${parentSku} is not in product master for this hub.`,
      };
    }
    return { success: true, parentSku, productType, vendorId };
  }

  const parentSku = String(doc.sku ?? '').trim();
  if (!parentSku) {
    return { success: false, message: 'This product has no SKU in product master.' };
  }
  return { success: true, parentSku, productType, vendorId };
}
