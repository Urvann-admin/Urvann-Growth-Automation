import { ListingProductModel } from '@/models/listingProduct';
import type {
  ListingProduct,
  ListingProductListingType,
  ListingProductSEO,
  ListingSection,
  ListingStatus,
  ListingParentItem,
} from '@/models/listingProduct';
import { ParentMasterModel, isBaseParent } from '@/models/parentMaster';
import { PurchaseMasterModel } from '@/models/purchaseMaster';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import { CategoryModel } from '@/models/category';
import { syncParentFromPurchases } from '@/app/api/purchase-master/syncParent';
import { expectedParentSkuForHub } from '@/lib/childListingHubSku';
import {
  generateSKU,
  parentListingLineParentSku,
  toCanonicalParentSkuForPurchases,
} from '@/lib/skuGenerator';
import { getSubstoresByHub } from '@/shared/constants/hubs';

export async function clearParentIsListedIfNoParentListings(canonicalSku: string) {
  const sku = String(canonicalSku).trim();
  if (!sku) return;
  try {
    const still = await ListingProductModel.hasParentTypeListingForCanonicalParentSku(sku);
    if (still) return;
    const parent = await ParentMasterModel.findBySku(sku);
    if (parent?._id) {
      await ParentMasterModel.update(parent._id, { isListed: false });
    }
  } catch (e) {
    console.error('[listing-product] Failed to clear parent isListed for', sku, e);
  }
}

export async function validateListingProductData(data: unknown): Promise<{
  success: boolean;
  message?: string;
  data?: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>;
}> {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Invalid data format' };
  }

  const d = data as Record<string, unknown>;

  const hasParentItems = Array.isArray((d as any).parentItems) && (d as any).parentItems.length > 0;

  if (!hasParentItems && (!Array.isArray(d.parentSkus) || d.parentSkus.length === 0)) {
    return { success: false, message: 'Either parentItems or parentSkus is required and must be non-empty' };
  }

  if (!d.plant || typeof d.plant !== 'string' || !String(d.plant).trim()) {
    return { success: false, message: 'plant is required and must be a non-empty string' };
  }

  if (!hasParentItems) {
    if (d.quantity === undefined || d.quantity === null || typeof d.quantity !== 'number' || d.quantity <= 0) {
      return { success: false, message: 'quantity is required and must be a positive number' };
    }
  }

  if (!d.section || !['listing', 'revival', 'growth', 'consumer'].includes(d.section as string)) {
    return { success: false, message: 'section is required and must be one of: listing, revival, growth, consumer' };
  }

  if (!Array.isArray(d.categories)) {
    return { success: false, message: 'categories must be an array' };
  }

  if (!Array.isArray(d.images)) {
    return { success: false, message: 'images must be an array' };
  }

  let parentItems: ListingParentItem[] = [];

  if (hasParentItems) {
    parentItems = ((d as any).parentItems as any[])
      .map((item) => ({
        parentSku: String(item.parentSku || '').trim(),
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
      }))
      .filter((item) => item.parentSku && item.quantity > 0);

    if (parentItems.length === 0) {
      return { success: false, message: 'parentItems must contain at least one valid parent with positive quantity' };
    }
  } else {
    const parentSkusLegacy = (d.parentSkus as string[]).map((sku) => String(sku).trim()).filter(Boolean);
    parentItems = parentSkusLegacy.map((sku) => ({
      parentSku: sku,
      quantity: Number(d.quantity),
      unitPrice: 0,
    }));
  }

  let parentSkus = parentItems.map((item) => item.parentSku);
  let parents = await Promise.all(parentSkus.map((sku) => ParentMasterModel.findBySku(sku)));

  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    if (!parent) {
      return { success: false, message: `Parent with SKU ${parentSkus[i]} not found` };
    }
    if (!isBaseParent(parent)) {
      return {
        success: false,
        message: `SKU ${parentSkus[i]} is not a base (parent) product and cannot be used in a listing`,
      };
    }
  }

  const listingTypeRaw =
    typeof d.listingType === 'string' ? d.listingType.toLowerCase().trim() : '';
  const listingType: ListingProductListingType =
    listingTypeRaw === 'parent' ? 'parent' : listingTypeRaw === 'child' ? 'child' : 'child';

  if (listingType === 'parent') {
    if (parentItems.length !== 1) {
      return {
        success: false,
        message: 'Parent listing must have exactly one parent in parentItems',
      };
    }
    const row = parentItems[0]!;
    if (row.quantity !== 1) {
      return {
        success: false,
        message: 'Parent listing requires quantity 1 for the parent line',
      };
    }
    const p = parents[0];
    if (!p) {
      return { success: false, message: `Parent with SKU ${parentSkus[0]} not found` };
    }
    const canonicalSku = String((p as { sku?: string }).sku || '').trim();
    if (!canonicalSku) {
      return { success: false, message: 'Base parent has no SKU; cannot create parent listing' };
    }
    parentItems = [{ parentSku: canonicalSku, quantity: 1, unitPrice: 0 }];
    parentSkus = [canonicalSku];
    parents = await Promise.all(parentSkus.map((sku) => ParentMasterModel.findBySku(sku)));
    const pNorm = parents[0];
    if (!pNorm || !isBaseParent(pNorm)) {
      return {
        success: false,
        message: `SKU ${canonicalSku} is not a base (parent) product and cannot be used in a listing`,
      };
    }
  }

  const imageUrls = (d.images as unknown[]).map((img) => String(img).trim()).filter(Boolean);
  if (imageUrls.length === 0) {
    return { success: false, message: 'At least one image is required' };
  }

  let totalPrice = 0;
  let minInventoryQuantity = Infinity;
  let maxTax = 0;
  const combinedCategories = new Set<string>();
  const combinedCollectionIds = new Set<string>();
  const combinedRedirects = new Set<string>();
  const combinedFeatures = new Set<string>();

  const getParentForSku = (sku: string) => {
    const index = parentSkus.indexOf(sku);
    return index >= 0 ? parents[index] : undefined;
  };

  // Determine which parents to use for features (plant parents only if mix of plant+pot)
  const plantParents = parents.filter(p => p && (p as any).parentKind !== 'pot');
  const featureSourceParents = new Set(
    (plantParents.length > 0 ? plantParents : parents).map(p => (p as any)?.sku).filter(Boolean)
  );

  for (const item of parentItems) {
    const parent = getParentForSku(item.parentSku);
    if (!parent) continue;

    const effectiveUnitPrice = (parent as any).sellingPrice ?? parent.price ?? 0;
    item.unitPrice = effectiveUnitPrice;

    totalPrice += effectiveUnitPrice * item.quantity;

    const availableQuantity = parent.inventory_quantity ?? 0;
    const inventoryForThisParent = item.quantity > 0
      ? Math.floor(availableQuantity / item.quantity)
      : 0;
    minInventoryQuantity = Math.min(minInventoryQuantity, inventoryForThisParent);

    if (parent.categories) {
      parent.categories.forEach((cat: string) => combinedCategories.add(cat));
    }

    if (parent.collectionIds) {
      parent.collectionIds.forEach((id: string) => combinedCollectionIds.add(String(id)));
    }

    // Tax: take max across all parents
    const parentTax = (parent as any).tax ? Number((parent as any).tax) : 0;
    if (parentTax > maxTax) maxTax = parentTax;

    const redirectsStr = (parent as any).redirects;
    if (
      combinedRedirects.size === 0 &&
      redirectsStr &&
      typeof redirectsStr === 'string'
    ) {
      const first = redirectsStr
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)[0];
      if (first) combinedRedirects.add(first);
    }

    // Features: only from plant parents (ignore pot parents if there are plant parents)
    if (featureSourceParents.has((parent as any).sku)) {
      const featuresStr = (parent as any).features;
      if (featuresStr && typeof featuresStr === 'string') {
        featuresStr.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((f: string) => combinedFeatures.add(f));
      }
    }
  }

  const potQuantity = typeof (d as any).potQuantity === 'number'
    ? (d as any).potQuantity
    : Number((d as any).potQuantity || 0);
  const potSize = typeof d.size === 'number' ? d.size : typeof d.size === 'string' ? parseFloat(d.size) : undefined;
  const potType = d.type ? String(d.type).trim() : undefined;

  const autoCategories = await getAutoCategoriesForProduct({
    plant: String(d.plant).trim(),
    variety: d.variety ? String(d.variety).trim() : undefined,
    colour: d.colour ? String(d.colour).trim() : undefined,
    height: typeof d.height === 'number' ? d.height : undefined,
    size: typeof d.size === 'number' ? d.size : undefined,
    type: d.type ? String(d.type).trim() : undefined,
  });

  autoCategories.forEach((cat) => combinedCategories.add(cat));

  if (Array.isArray(d.categories)) {
    (d.categories as unknown[]).forEach((c) => {
      const s = String(c).trim();
      if (s) combinedCategories.add(s);
    });
  }

  let sku: string | undefined;
  const setQuantity = typeof (d as any).setQuantity === 'number'
    ? (d as any).setQuantity
    : Number((d as any).setQuantity || 0);

  const skuQuantityForCode = setQuantity > 0
    ? setQuantity
    : typeof d.quantity === 'number'
      ? d.quantity
      : Number(d.quantity || 0) || 1;

  const hub = d.hub ? String(d.hub).trim() : undefined;
  const substores = hub ? getSubstoresByHub(hub) : [];

  const finalInventory = minInventoryQuantity === Infinity ? 0 : minInventoryQuantity;

  let parentKindOut: 'plant' | 'pot' | undefined;
  const pkRaw = (d as { parentKind?: unknown }).parentKind;
  if (pkRaw != null && String(pkRaw).trim() !== '') {
    const pk = String(pkRaw).trim().toLowerCase();
    if (pk === 'plant' || pk === 'pot') parentKindOut = pk;
  }
  if (!parentKindOut && listingType === 'parent' && parents[0]) {
    const fromP = (parents[0] as { parentKind?: string }).parentKind;
    if (fromP === 'plant' || fromP === 'pot') parentKindOut = fromP;
  }

  let SEO: ListingProductSEO | undefined;
  const seoRaw = (d as any).SEO ?? (d as any).seo;
  if (seoRaw && typeof seoRaw === 'object' && !Array.isArray(seoRaw)) {
    const title = String((seoRaw as { title?: unknown }).title ?? '').trim();
    const description = String((seoRaw as { description?: unknown }).description ?? '').trim();
    if (title || description) {
      SEO = { title, description };
    }
  }

  // Tax: use form-provided value if present, otherwise fall back to parent-derived max
  const formTax = (d as any).tax;
  const resolvedTax: number | undefined = formTax
    ? (Number(formTax) > 0 ? Number(formTax) : undefined)
    : (maxTax > 0 ? maxTax : undefined);

  // Redirects: use form-provided array if present, otherwise parent-derived
  let resolvedRedirects: string[] | undefined;
  if (Array.isArray((d as any).redirects) && (d as any).redirects.length > 0) {
    const urls = (d as any).redirects.map((r: unknown) => String(r).trim()).filter(Boolean);
    resolvedRedirects = urls[0] !== undefined ? [urls[0]] : undefined;
  } else if (combinedRedirects.size > 0) {
    const one = Array.from(combinedRedirects)[0];
    resolvedRedirects = one ? [one] : undefined;
  }

  // Features: use form-provided array if present, otherwise parent-derived (plant-only filtered)
  let resolvedFeatures: string[] | undefined;
  if (Array.isArray((d as any).features) && (d as any).features.length > 0) {
    resolvedFeatures = (d as any).features.map((f: unknown) => String(f).trim()).filter(Boolean);
  } else if (combinedFeatures.size > 0) {
    resolvedFeatures = Array.from(combinedFeatures);
  }


  const parentHubField =
    listingType === 'parent' && parents[0]
      ? String((parents[0] as { hub?: string }).hub ?? '').trim()
      : undefined;

  const parentItemsPersisted: ListingParentItem[] =
    listingType === 'parent' && hub && parentItems[0]
      ? [
          {
            ...parentItems[0],
            parentSku: parentListingLineParentSku(hub, parentItems[0].parentSku, parentHubField),
          },
        ]
      : listingType === 'child' && hub
        ? parentItems.map((item) => ({
            ...item,
            parentSku: expectedParentSkuForHub(hub, item.parentSku),
          }))
        : parentItems;

  if (hub) {
    if (listingType === 'parent' && parentItems[0]) {
      sku = parentListingLineParentSku(hub, parentItems[0].parentSku, parentHubField);
    } else if (d.plant && skuQuantityForCode) {
      try {
        sku = await generateSKU(hub, String(d.plant).trim(), skuQuantityForCode);
      } catch (error) {
        console.error('SKU generation failed:', error);
        return { success: false, message: `SKU generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
    }
  }

  const validated: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'> = {
    parentItems: parentItemsPersisted,
    plant: String(d.plant).trim(),
    otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
    variety: d.variety ? String(d.variety).trim() : undefined,
    colour: d.colour ? String(d.colour).trim() : undefined,
    height: typeof d.height === 'number' ? d.height : undefined,
    mossStick: d.mossStick ? String(d.mossStick).trim() : undefined,
    size: typeof d.size === 'number' ? d.size : potSize,
    type: potType,
    finalName: (() => {
      const setQty = setQuantity > 0 ? setQuantity : 1;
      const getParent = (skuKey: string): { finalName?: string; plant?: string } | undefined => {
        const p = getParentForSku(skuKey);
        if (!p) return undefined;
        return { finalName: (p as { finalName?: string; plant?: string }).finalName, plant: (p as { finalName?: string; plant?: string }).plant };
      };
      const fromParents = generateFinalNameFromParents(parentItems, getParent, potSize, potType, setQty);
      return fromParents || generateFinalName({
        plant: String(d.plant).trim(),
        otherNames: d.otherNames ? String(d.otherNames).trim() : undefined,
        variety: d.variety ? String(d.variety).trim() : undefined,
        colour: d.colour ? String(d.colour).trim() : undefined,
        size: typeof d.size === 'number' ? d.size : undefined,
        type: d.type ? String(d.type).trim() : undefined,
      });
    })(),
    description: d.description ? String(d.description).trim() : undefined,
    quantity: typeof d.quantity === 'number' ? d.quantity : Number(d.quantity || 0) || 1,
    setQuantity: setQuantity > 0 ? setQuantity : undefined,
    potQuantity: potQuantity > 0 ? potQuantity : undefined,
    price: totalPrice,
    inventory_quantity: finalInventory,
    tags: Array.isArray((d as any).tags)
      ? (d as any).tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : undefined,
    compare_at_price: typeof (d as any).compare_at_price === 'number' ? (d as any).compare_at_price : undefined,
    tax: resolvedTax,
    sort_order: typeof (d as any).sort_order === 'number' ? (d as any).sort_order : 3000,
    publish_status: finalInventory > 0 ? 1 : 0,
    categories: Array.from(combinedCategories),
    collectionIds: Array.from(combinedCollectionIds),
    redirects: resolvedRedirects,
    features: resolvedFeatures,
    images: imageUrls,
    sku: sku,
    base_sku: (() => {
      const raw = (d as { base_sku?: unknown }).base_sku;
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
      if (hub && parentItemsPersisted[0]) {
        return toCanonicalParentSkuForPurchases('parent', hub, parentItemsPersisted[0].parentSku);
      }
      return undefined;
    })(),
    section: d.section as ListingSection,
    listingType,
    ...(parentKindOut ? { parentKind: parentKindOut } : {}),
    status: (d.status as ListingStatus) || 'draft',
    seller: d.seller ? String(d.seller).trim() : undefined,
    hub: hub,
    substores: substores.length > 0 ? substores : undefined,
    ...(SEO ? { SEO } : {}),
  };

  if (validated.listingType === 'parent' && validated.hub && validated.parentItems[0]) {
    const canon = toCanonicalParentSkuForPurchases(
      'parent',
      validated.hub,
      validated.parentItems[0].parentSku
    );
    const dupListing = await ListingProductModel.findExistingParentListingForHubSection(
      validated.hub,
      validated.section,
      canon
    );
    if (dupListing) {
      return {
        success: false,
        message: `This parent already has a listing for hub "${validated.hub}" in this section (SKU: ${dupListing.sku ?? '—'}). Choose another hub or remove the existing listing.`,
      };
    }
  }

  if (validated.sku) {
    const skuClash = await ListingProductModel.findBySku(validated.sku);
    if (skuClash) {
      return {
        success: false,
        message: `Listing SKU "${validated.sku}" already exists. Retry save to generate a new code.`,
      };
    }
  }

  return { success: true, data: validated };
}

function parentNameBeforeIn(parent: { finalName?: string; plant?: string } | null): string {
  if (!parent) return '';
  const name = String((parent.finalName || parent.plant || '').trim());
  const idx = name.toLowerCase().indexOf(' in ');
  return idx >= 0 ? name.slice(0, idx).trim() : name;
}

function generateFinalNameFromParents(
  parentItems: { parentSku: string }[],
  getParent: (sku: string) => { finalName?: string; plant?: string } | undefined,
  size?: number,
  type?: string,
  setQuantity: number = 1
): string {
  const parentNames = parentItems
    .map((item) => parentNameBeforeIn(getParent(item.parentSku) ?? null))
    .filter(Boolean);
  if (parentNames.length === 0) return '';
  const parts = [parentNames.join(' & ')];
  if (size) parts.push(`in ${size} inch`);
  if (type) parts.push(type);
  const base = parts.join(' ');
  if (setQuantity > 1) return `Set of ${setQuantity} ${base}`;
  return base;
}

export function generateFinalName(data: {
  plant: string;
  otherNames?: string;
  variety?: string;
  colour?: string;
  size?: number;
  type?: string;
}): string {
  const parts = [data.plant];

  if (data.otherNames) parts.push(data.otherNames);
  if (data.variety) parts.push(data.variety);
  if (data.colour) parts.push(data.colour);
  if (data.size) parts.push('in', String(data.size), 'inch');
  if (data.type) parts.push(data.type);

  return parts.filter(Boolean).join(' ');
}

async function getAutoCategoriesForProduct(product: {
  plant: string;
  variety?: string;
  colour?: string;
  height?: number;
  size?: number;
  type?: string;
}): Promise<string[]> {
  try {
    const categories = await CategoryModel.findAll();
    const matchingCategories: string[] = [];

    for (const category of categories) {
      if (category.rule && evaluateRule(category.rule, product)) {
        matchingCategories.push(category.alias);
      }
    }

    return matchingCategories;
  } catch (error) {
    console.error('Error evaluating category rules:', error);
    return [];
  }
}

function evaluateRule(rule: any, product: any): boolean {
  if (!rule || !rule.items || !Array.isArray(rule.items)) {
    return false;
  }

  const results = rule.items.map((item: any) => {
    if (item.field && item.value !== undefined) {
      return evaluateCondition(item, product);
    } else if (item.rule_operator && item.items) {
      return evaluateRule(item, product);
    }
    return false;
  });

  if (rule.rule_operator === 'AND') {
    return results.every(Boolean);
  } else if (rule.rule_operator === 'OR') {
    return results.some(Boolean);
  }

  return false;
}

function evaluateCondition(condition: any, product: any): boolean {
  const field = condition.field;
  const expectedValue = condition.value;

  let actualValue: any;

  switch (field) {
    case 'Plant':
      actualValue = product.plant;
      break;
    case 'variety':
      actualValue = product.variety;
      break;
    case 'Colour':
      actualValue = product.colour;
      break;
    case 'Height':
      actualValue = product.height;
      break;
    case 'Size':
      actualValue = product.size;
      break;
    case 'Type':
      actualValue = product.type;
      break;
    default:
      return false;
  }

  if (actualValue === undefined || actualValue === null) {
    return false;
  }

  if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
    return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
  }

  if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
    return actualValue === expectedValue;
  }

  return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
}

export async function updateParentQuantitiesAfterCreation(
  listingProducts: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>[]
): Promise<void> {
  const parentUpdates = new Map<
    string,
    { section: ListingSection; quantityToDeduct: number; hub?: string }
  >();

  for (const listingProduct of listingProducts) {
    const items: ListingParentItem[] =
      (listingProduct.parentItems && listingProduct.parentItems.length > 0)
        ? listingProduct.parentItems
        : (listingProduct.parentSkus ?? []).map((sku) => ({
            parentSku: sku,
            quantity: listingProduct.quantity,
            unitPrice: 0,
          }));

    for (const item of items) {
      const hubStr = listingProduct.hub?.trim();
      const key =
        listingProduct.listingType === 'parent' && hubStr
          ? String(item.parentSku || '').trim()
          : toCanonicalParentSkuForPurchases(
              listingProduct.listingType,
              listingProduct.hub,
              item.parentSku
            );
      const totalUnitsToDeduct = (listingProduct.inventory_quantity || 0) * (item.quantity || 0);
      if (totalUnitsToDeduct <= 0) continue;

      const existing = parentUpdates.get(key);
      if (existing) {
        existing.quantityToDeduct += totalUnitsToDeduct;
      } else {
        parentUpdates.set(key, {
          section: listingProduct.section,
          quantityToDeduct: totalUnitsToDeduct,
          hub: listingProduct.hub,
        });
      }
    }
  }

  for (const [parentSku, update] of parentUpdates) {
    if (update.section === 'listing') {
      let remaining = update.quantityToDeduct;
      const purchases = await PurchaseMasterModel.findByParentSku(parentSku);
      const listingPurchases = purchases
        .filter((p) => (p.type?.listing ?? 0) > 0)
        .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

      for (const purchase of listingPurchases) {
        if (remaining <= 0) break;
        const listingVal = Number(purchase.type?.listing) || 0;
        const grossListing = listingVal > 1 ? listingVal : (Number(purchase.quantity) || 0);
        const currentListed = Number((purchase as { listed_quantity?: number }).listed_quantity ?? 0) || 0;
        const available = Math.max(0, grossListing - currentListed);
        const toAdd = Math.min(remaining, available);
        if (toAdd > 0 && purchase._id) {
          await PurchaseMasterModel.update(purchase._id, {
            listed_quantity: currentListed + toAdd,
          });
          remaining -= toAdd;
        }
      }

      await syncParentFromPurchases(parentSku, update.hub);
    } else {
      const parent = await ParentMasterModel.findBaseParentForInventorySync(update.hub, parentSku);
      if (parent && isBaseParent(parent) && parent.typeBreakdown) {
        const sectionKey = update.section === 'consumer' ? 'consumers' : update.section;
        const currentQuantity = Number(parent.typeBreakdown[sectionKey] ?? 0) || 0;
        const newQuantity = Math.max(0, Math.floor(currentQuantity - update.quantityToDeduct));
        const updatedTypeBreakdown: PurchaseTypeBreakdown = {
          ...parent.typeBreakdown,
          [sectionKey]: newQuantity,
        };
        await ParentMasterModel.update(parent._id!, {
          typeBreakdown: updatedTypeBreakdown,
        });
      }
    }
  }
}
