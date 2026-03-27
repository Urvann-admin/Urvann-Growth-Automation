import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import type { ListingProduct, ListingSection } from '@/models/listingProduct';
import { expectedParentSkuForHub, canonicalBaseSkuForParentItem } from '@/lib/childListingHubSku';
import { appendHubLetterToParentSku, generateSKU } from '@/lib/skuGenerator';
import { getSubstoresByHub } from '@/shared/constants/hubs';

type MissingParentSku = {
  canonicalParentSku: string;
  expectedSku: string;
};

type BlockedHubResult = {
  hub: string;
  missingParentSkus: MissingParentSku[];
};

export type ReplicationPreflightProductResult = {
  productId: string;
  productName: string;
  currentSku: string;
  sourceHub: string;
  replicableHubs: string[];
  blockedHubs: BlockedHubResult[];
};

export type ReplicationPreflightResult = {
  summary: {
    selectedProducts: number;
    targetHubs: number;
    replicablePairs: number;
    blockedPairs: number;
    replicableProducts: number;
    blockedProducts: number;
  };
  products: ReplicationPreflightProductResult[];
};

export async function loadProductsByIds(
  section: ListingSection,
  productIds: string[]
): Promise<ListingProduct[]> {
  const objectIds = productIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objectIds.length === 0) return [];
  const collection = await getCollection('listingProduct');
  const docs = await collection
    .find({ _id: { $in: objectIds }, section })
    .toArray();
  return docs as unknown as ListingProduct[];
}

export function normalizeHubs(hubs: string[]): string[] {
  return [...new Set(hubs.map((h) => String(h || '').trim()).filter(Boolean))];
}

function canonicalParentsForProduct(product: ListingProduct): string[] {
  const items = Array.isArray(product.parentItems) ? product.parentItems : [];
  const set = new Set<string>();
  for (const item of items) {
    const canonical = canonicalBaseSkuForParentItem({ parentSku: String(item.parentSku ?? '') });
    if (canonical) set.add(canonical);
  }
  return [...set];
}

export async function buildPreflightResult(
  section: ListingSection,
  selectedProducts: ListingProduct[],
  targetHubs: string[]
): Promise<ReplicationPreflightResult> {
  const allParentListings =
    selectedProducts.length > 0 &&
    selectedProducts.every((p) => p.listingType === 'parent');

  const found = new Set<string>();
  if (!allParentListings) {
    const dedupeExpected = new Set<string>();
    const expectedSkus = new Set<string>();
    for (const product of selectedProducts) {
      const canonicalParents = canonicalParentsForProduct(product);
      for (const hub of targetHubs) {
        for (const canonical of canonicalParents) {
          const expectedSku = expectedParentSkuForHub(hub, canonical);
          if (!expectedSku) continue;
          const key = `${hub}\0${canonical}`;
          if (!dedupeExpected.has(key)) {
            dedupeExpected.add(key);
            expectedSkus.add(expectedSku);
          }
        }
      }
    }

    if (expectedSkus.size > 0) {
      const collection = await getCollection('listingProduct');
      const docs = await collection
        .find({
          section,
          sku: { $in: [...expectedSkus] },
        })
        .project({ sku: 1 })
        .toArray();
      for (const doc of docs) {
        const sku = String((doc as { sku?: string }).sku ?? '').trim();
        if (sku) found.add(sku);
      }
    }
  }

  const productResults: ReplicationPreflightProductResult[] = [];
  let replicablePairs = 0;
  let blockedPairs = 0;

  for (const product of selectedProducts) {
    const canonicalParents = canonicalParentsForProduct(product);
    const blockedHubs: BlockedHubResult[] = [];
    const replicableHubs: string[] = [];

    for (const hub of targetHubs) {
      const sourceHub = String(product.hub ?? '').trim();
      if (sourceHub && sourceHub.toLowerCase() === hub.toLowerCase()) {
        blockedHubs.push({
          hub,
          missingParentSkus: [],
        });
        blockedPairs += 1;
        continue;
      }

      /** Parent listings replicate without requiring parent-line listings in the target hub; only unique SKU is enforced at insert. */
      if (product.listingType === 'parent') {
        replicableHubs.push(hub);
        replicablePairs += 1;
        continue;
      }

      const missingParentSkus: MissingParentSku[] = [];
      for (const canonical of canonicalParents) {
        const expectedSku = expectedParentSkuForHub(hub, canonical);
        if (!expectedSku || !found.has(expectedSku)) {
          missingParentSkus.push({
            canonicalParentSku: canonical,
            expectedSku,
          });
        }
      }

      if (missingParentSkus.length > 0) {
        blockedHubs.push({ hub, missingParentSkus });
        blockedPairs += 1;
      } else {
        replicableHubs.push(hub);
        replicablePairs += 1;
      }
    }

    productResults.push({
      productId: String(product._id ?? ''),
      productName: String(product.finalName || product.plant || 'Unnamed product'),
      currentSku: String(product.sku ?? ''),
      sourceHub: String(product.hub ?? ''),
      replicableHubs,
      blockedHubs,
    });
  }

  return {
    summary: {
      selectedProducts: selectedProducts.length,
      targetHubs: targetHubs.length,
      replicablePairs,
      blockedPairs,
      replicableProducts: productResults.filter((p) => p.replicableHubs.length > 0).length,
      blockedProducts: productResults.filter((p) => p.blockedHubs.length > 0).length,
    },
    products: productResults,
  };
}

export type RetryPair = { productId: string; hub: string };

/**
 * Preflight only for explicit (productId × hub) pairs (e.g. retry after fixing missing parent listings).
 * Ignores pairs not present in selectedProducts. Dedupes duplicate pairs.
 */
export async function buildPreflightResultForRetryPairs(
  section: ListingSection,
  selectedProducts: ListingProduct[],
  retryPairs: RetryPair[]
): Promise<ReplicationPreflightResult> {
  const seenPair = new Set<string>();
  const productToHubs = new Map<string, string[]>();

  for (const raw of retryPairs) {
    const productId = String(raw.productId ?? '').trim();
    const hub = String(raw.hub ?? '').trim();
    if (!productId || !hub) continue;
    const key = `${productId}\0${hub}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    const list = productToHubs.get(productId) ?? [];
    list.push(hub);
    productToHubs.set(productId, list);
  }

  const productsInRetry = selectedProducts.filter((p) => productToHubs.has(String(p._id ?? '')));

  const dedupeExpected = new Set<string>();
  const expectedSkus = new Set<string>();
  for (const product of productsInRetry) {
    const pid = String(product._id ?? '');
    const hubs = productToHubs.get(pid) ?? [];
    const canonicalParents = canonicalParentsForProduct(product);
    for (const hub of hubs) {
      for (const canonical of canonicalParents) {
        const expectedSku = expectedParentSkuForHub(hub, canonical);
        if (!expectedSku) continue;
        const k = `${hub}\0${canonical}`;
        if (!dedupeExpected.has(k)) {
          dedupeExpected.add(k);
          expectedSkus.add(expectedSku);
        }
      }
    }
  }

  const found = new Set<string>();
  if (expectedSkus.size > 0) {
    const collection = await getCollection('listingProduct');
    const docs = await collection
      .find({
        section,
        sku: { $in: [...expectedSkus] },
      })
      .project({ sku: 1 })
      .toArray();
    for (const doc of docs) {
      const sku = String((doc as { sku?: string }).sku ?? '').trim();
      if (sku) found.add(sku);
    }
  }

  const productResults: ReplicationPreflightProductResult[] = [];
  let replicablePairs = 0;
  let blockedPairs = 0;
  const uniqueHubsInRetry = new Set<string>();

  for (const product of productsInRetry) {
    const pid = String(product._id ?? '');
    const targetHubsForProduct = productToHubs.get(pid) ?? [];
    for (const h of targetHubsForProduct) uniqueHubsInRetry.add(h);

    const blockedHubs: BlockedHubResult[] = [];
    const replicableHubs: string[] = [];

    for (const hub of targetHubsForProduct) {
      const sourceHub = String(product.hub ?? '').trim();
      if (sourceHub && sourceHub.toLowerCase() === hub.toLowerCase()) {
        blockedHubs.push({ hub, missingParentSkus: [] });
        blockedPairs += 1;
        continue;
      }

      if (product.listingType === 'parent') {
        replicableHubs.push(hub);
        replicablePairs += 1;
        continue;
      }

      const missingParentSkus: MissingParentSku[] = [];
      const canonicalParents = canonicalParentsForProduct(product);
      for (const canonical of canonicalParents) {
        const expectedSku = expectedParentSkuForHub(hub, canonical);
        if (!expectedSku || !found.has(expectedSku)) {
          missingParentSkus.push({ canonicalParentSku: canonical, expectedSku });
        }
      }

      if (missingParentSkus.length > 0) {
        blockedHubs.push({ hub, missingParentSkus });
        blockedPairs += 1;
      } else {
        replicableHubs.push(hub);
        replicablePairs += 1;
      }
    }

    productResults.push({
      productId: pid,
      productName: String(product.finalName || product.plant || 'Unnamed product'),
      currentSku: String(product.sku ?? ''),
      sourceHub: String(product.hub ?? ''),
      replicableHubs,
      blockedHubs,
    });
  }

  return {
    summary: {
      selectedProducts: productResults.length,
      targetHubs: uniqueHubsInRetry.size,
      replicablePairs,
      blockedPairs,
      replicableProducts: productResults.filter((p) => p.replicableHubs.length > 0).length,
      blockedProducts: productResults.filter((p) => p.blockedHubs.length > 0).length,
    },
    products: productResults,
  };
}

function buildTargetFingerprint(product: ListingProduct, targetHub: string): string {
  const parts = (product.parentItems || [])
    .map((item) => {
      const canonical = canonicalBaseSkuForParentItem({ parentSku: String(item.parentSku ?? '') });
      const targetParentSku = canonical ? appendHubLetterToParentSku(targetHub, canonical) : '';
      return `${targetParentSku}:${Number(item.quantity || 0)}`;
    })
    .filter(Boolean)
    .sort();
  return [
    String(product.section ?? ''),
    String(product.listingType ?? ''),
    String(product.plant ?? ''),
    String(product.setQuantity ?? 0),
    ...parts,
  ].join('|');
}

export async function executeReplication(
  section: ListingSection,
  selectedProducts: ListingProduct[],
  preflight: ReplicationPreflightResult
) {
  const collection = await getCollection('listingProduct');
  const targetHubs = [...new Set(preflight.products.flatMap((p) => p.replicableHubs))];
  const plants = [...new Set(selectedProducts.map((p) => String(p.plant || '').trim()).filter(Boolean))];
  const existingDocs = await collection
    .find({
      section,
      hub: { $in: targetHubs },
      plant: { $in: plants },
    })
    .toArray();

  const existingFingerprintSet = new Set<string>();
  for (const doc of existingDocs as unknown as ListingProduct[]) {
    const hub = String(doc.hub ?? '').trim();
    if (!hub) continue;
    existingFingerprintSet.add(buildTargetFingerprint(doc, hub));
  }

  const sourceById = new Map(selectedProducts.map((p) => [String(p._id ?? ''), p]));
  const toCreate: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>[] = [];
  const skipped: Array<{ productId: string; hub: string; reason: string }> = [];

  for (const row of preflight.products) {
    const source = sourceById.get(row.productId);
    if (!source) continue;
    const { _id: _sourceId, ...sourceWithoutId } = source;

    for (const targetHub of row.replicableHubs) {
      const targetFp = buildTargetFingerprint(source, targetHub);
      const isParentSource = source.listingType === 'parent';
      if (!isParentSource && existingFingerprintSet.has(targetFp)) {
        skipped.push({ productId: row.productId, hub: targetHub, reason: 'Duplicate listing already exists' });
        continue;
      }

      const parentItems = (source.parentItems || []).map((item) => {
        const canonical = canonicalBaseSkuForParentItem({ parentSku: String(item.parentSku ?? '') });
        return {
          ...item,
          parentSku: canonical ? appendHubLetterToParentSku(targetHub, canonical) : String(item.parentSku ?? ''),
        };
      });

      let generatedSku: string | undefined;
      let allocated = false;

      if (source.listingType === 'parent' && parentItems[0]) {
        // For parent listings, the SKU IS the hub-prefixed parent SKU (same as parentItems[0].parentSku)
        generatedSku = parentItems[0].parentSku;
        const clash = await collection.findOne({ sku: generatedSku }, { projection: { _id: 1 } });
        if (!clash) {
          allocated = true;
        }
      } else {
        const setQuantity = Number(source.setQuantity || 0);
        const skuQty = setQuantity > 0 ? setQuantity : Number(source.quantity || 1);
        const plant = String(source.plant || '').trim();
        for (let attempt = 0; attempt < 25; attempt++) {
          try {
            generatedSku = await generateSKU(targetHub, plant, skuQty || 1);
          } catch {
            generatedSku = undefined;
            break;
          }
          const clash = await collection.findOne({ sku: generatedSku }, { projection: { _id: 1 } });
          if (!clash) {
            allocated = true;
            break;
          }
        }
      }

      if (!allocated || !generatedSku) {
        skipped.push({
          productId: row.productId,
          hub: targetHub,
          reason: 'Could not allocate a unique SKU (listingProduct.sku must be unique)',
        });
        continue;
      }

      toCreate.push({
        ...sourceWithoutId,
        parentItems,
        sku: generatedSku,
        hub: targetHub,
        substores: getSubstoresByHub(targetHub),
      });
      existingFingerprintSet.add(targetFp);
    }
  }

  if (toCreate.length > 0) {
    const now = new Date();
    await collection.insertMany(
      toCreate.map((doc) => ({
        ...doc,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  return {
    createdCount: toCreate.length,
    skipped,
  };
}
