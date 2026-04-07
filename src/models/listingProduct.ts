import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { normalizeListingImageUrlForMatch } from '@/lib/listingImageUrl';
import {
  candidateBaseParentSkusForParentListing,
  toCanonicalParentSkuForPurchases,
} from '@/lib/skuGenerator';

/** Section types for listing products */
export type ListingSection = 'listing' | 'revival' | 'growth' | 'consumer';

/** Status types for listing products */
export type ListingStatus = 'draft' | 'listed' | 'published';

/** Whether the listing row lists a single base parent vs a composed child product */
export type ListingProductListingType = 'parent' | 'child';

/** Store-style SEO block (e.g. StoreHippo) */
export interface ListingProductSEO {
  title: string;
  description: string;
}

/**
 * Snapshot of how a listing line item is composed from parent SKUs.
 *
 * - `parentSku` – SKU of the parent in `parentMaster`
 * - `quantity`  – how many units of this parent are used per ONE set of the
 *                 final listing product
 * - `unitPrice` – price of the parent at the time of listing creation
 */
export interface ListingParentItem {
  /**
   * Base parent SKU from Parent Master, or — for `listingType: 'parent'` with a `hub` —
   * hub letter + base SKU (e.g. `WTES000501`) so the line matches hub-scoped inventory. Purchase / parent sync uses the canonical SKU.
   */
  parentSku: string;
  quantity: number;
  unitPrice: number;
}

export interface ListingProduct {
  _id?: string | ObjectId;
  /**
   * Detailed breakdown of parent composition for this listing.
   * Source of truth for parent composition; used for inventory / price calculations.
   * Only this array is persisted; parentSkus can be derived as parentItems.map(i => i.parentSku).
   */
  parentItems: ListingParentItem[];
  /** @deprecated Legacy: only present on old documents; derive from parentItems when reading. */
  parentSkus?: string[];
  /** parent = one base parent per listing line; child = one or more parents in composition */
  listingType?: ListingProductListingType;
  /** Merchandising kind for parent-type lines (mirrors parentMaster.parentKind) */
  parentKind?: 'plant' | 'pot';
  /** Plant name */
  plant: string;
  /** Other names for the plant */
  otherNames?: string;
  /** Variety of the plant */
  variety?: string;
  /** Colour of the plant */
  colour?: string;
  /** Height in feet */
  height?: number;
  /** Moss Stick type */
  mossStick?: string;
  /** Size in inches (pot size) */
  size?: number;
  /** Type of the product (pot type) */
  type?: string;
  /** Final name: auto-generated from product attributes */
  finalName?: string;
  /** Product description (rich text HTML) */
  description?: string;
  /**
   * Quantity of this child product to create (legacy – kept for compatibility).
   * For the new line‑item flow, use `setQuantity` instead.
   */
  quantity: number;
  /**
   * Number of units in one set for this listing (used for SKU last 2 digits).
   * Example: a 3‑plant set will have `setQuantity = 3`.
   */
  setQuantity?: number;
  /**
   * Number of pots used per set for this listing.
   * Combined with pot size/type to look up pot price.
   */
  potQuantity?: number;
  /**
   * Calculated price for ONE SET:
   *   Σ(parent.unitPrice * parent.quantity) + potPrice * potQuantity
   */
  price: number;
  /**
   * Calculated inventory quantity:
   *   min( floor(parentAvailableUnits / parentItem.quantity) ) across all parents.
   * Represents how many sets can be made from parents.
   */
  inventory_quantity: number;
  /** Combined categories from parent categories + rule-based categories */
  categories: string[];
  /** Auto-populated collection IDs from parent collections */
  collectionIds?: (string | ObjectId)[];
  /** Combined redirects from parent redirects */
  redirects?: string[];
  /** Combined features from parent features */
  features?: string[];
  /** Selected AWS S3 image URLs from collections */
  images: string[];
  /** Generated SKU for this listing product */
  sku?: string;
  /** Base parent SKU without hub letter (aligned with `parentMaster.base_sku` for parent-type listings). */
  base_sku?: string;
  /** Which section this belongs to */
  section: ListingSection;
  /** Listing status */
  status: ListingStatus;
  /** Storefront seller: `seller_id` from sellerMaster (aligned with hub / parent row) */
  seller?: string;
  /** Hub name (e.g. Whitefield, HSR) for inventory/listing scope */
  hub?: string;
  /** Substores derived from hub mapping */
  substores?: string[];
  /** Merchandising tags (multi-select; aligned with `parentMaster.tags`) */
  tags?: string[];
  /** Compare-at price shown as original/strikethrough price */
  compare_at_price?: number;
  /** GST / tax rate: 5 or 18 (stored as number); derived as max of parent tax values */
  tax?: number;
  /** SEO title and description for storefront */
  SEO?: ListingProductSEO;
  /** Display sort order; defaults to 3000 */
  sort_order?: number;
  /** Publish status: 1 = published, 0 = unpublished. Auto-set based on inventory_quantity. */
  publish_status?: 0 | 1;
  /** StoreHippo product ID (if synced) */
  storeHippoId?: string;
  /** StoreHippo product _id - same as storeHippoId */
  product_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'listingProduct';

/** Derive parentSkus from parentItems for API responses (backward compat). */
export function withDerivedParentSkus<T extends { parentItems?: ListingParentItem[]; parentSkus?: string[] }>(
  item: T
): T & { parentSkus: string[] } {
  const parentSkus = item.parentItems?.length
    ? item.parentItems.map((i) => i.parentSku)
    : item.parentSkus ?? [];
  return { ...item, parentSkus };
}

export class ListingProductModel {
  static async getCollection() {
    return getCollection(COLLECTION_NAME);
  }

  static async findAll(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find(query).toArray();
  }

  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.findOne({ _id: queryId as any });
  }

  static async findBySku(sku: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ sku: String(sku).trim() });
  }

  static async findBySection(section: ListingSection) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ section }).toArray();
  }

  /**
   * Image URLs attached to any listing product in a section.
   * Used to hide those photos from the child listing queue. URLs are normalized for matching.
   */
  static async listImageUrlsFromSection(section: ListingSection): Promise<string[]> {
    const collection = await getCollection(COLLECTION_NAME);
    const cursor = collection.find({ section }, { projection: { images: 1 } });
    const keys = new Set<string>();
    for await (const doc of cursor) {
      const images = (doc as ListingProduct).images;
      if (!Array.isArray(images)) continue;
      for (const u of images) {
        const n = normalizeListingImageUrlForMatch(String(u));
        if (n) keys.add(n);
      }
    }
    return [...keys];
  }

  static async findByParentSku(parentSku: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ 'parentItems.parentSku': parentSku }).toArray();
  }

  static async findByParentSkus(parentSkus: string[]) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ 'parentItems.parentSku': { $in: parentSkus } }).toArray();
  }

  /**
   * Canonical base parent SKUs that already have at least one `listingType: 'parent'` document.
   * Used when `excludeListed=true` on parent-master (optional filter); parent listing UI no longer relies on `isListed`.
   */
  static async getCanonicalParentSkusWithParentListings(): Promise<string[]> {
    const collection = await getCollection(COLLECTION_NAME);
    const docs = await collection
      .find({ listingType: 'parent' as ListingProductListingType }, { projection: { hub: 1, parentItems: { $slice: 1 } } })
      .toArray();
    const set = new Set<string>();
    for (const doc of docs) {
      const hub = doc.hub ? String(doc.hub).trim() : undefined;
      const raw = (doc as { parentItems?: { parentSku?: string }[] }).parentItems?.[0]?.parentSku;
      if (!raw) continue;
      for (const c of candidateBaseParentSkusForParentListing(String(raw), hub)) {
        set.add(c);
      }
    }
    return [...set];
  }

  /** Whether any parent-type listing still references this canonical base parent SKU (after hub-prefix normalization). */
  static async hasParentTypeListingForCanonicalParentSku(canonicalSku: string): Promise<boolean> {
    const canon = String(canonicalSku).trim();
    if (!canon) return false;
    const collection = await getCollection(COLLECTION_NAME);
    const cursor = collection.find(
      { listingType: 'parent' as ListingProductListingType },
      { projection: { hub: 1, parentItems: { $slice: 1 } } }
    );
    for await (const doc of cursor) {
      const hub = doc.hub ? String(doc.hub).trim() : undefined;
      const raw = (doc as { parentItems?: { parentSku?: string }[] }).parentItems?.[0]?.parentSku;
      if (!raw) continue;
      const candidates = candidateBaseParentSkusForParentListing(String(raw), hub);
      if (candidates.includes(canon)) return true;
    }
    return false;
  }

  /** Parent-type row already present for this hub, section, and canonical base parent (blocks duplicate hub publish). */
  static async findExistingParentListingForHubSection(
    hub: string,
    section: ListingSection,
    canonicalParentSku: string
  ): Promise<ListingProduct | null> {
    const h = String(hub ?? '').trim();
    const canon = String(canonicalParentSku ?? '').trim();
    if (!h || !canon) return null;
    const collection = await getCollection(COLLECTION_NAME);
    const cursor = collection.find(
      {
        listingType: 'parent' as ListingProductListingType,
        hub: h,
        section,
      },
      { projection: { sku: 1, parentItems: { $slice: 1 } } }
    );
    for await (const doc of cursor) {
      const raw = (doc as ListingProduct).parentItems?.[0]?.parentSku;
      if (!raw) continue;
      const docCanon = toCanonicalParentSkuForPurchases('parent', h, String(raw));
      if (docCanon === canon) return doc as ListingProduct;
      const candidates = candidateBaseParentSkusForParentListing(String(raw), h);
      if (candidates.includes(canon)) return doc as ListingProduct;
    }
    return null;
  }

  static async create(data: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async createMany(dataArray: Omit<ListingProduct, '_id' | 'createdAt' | 'updatedAt'>[]) {
    const collection = await getCollection(COLLECTION_NAME);
    const now = new Date();
    const documents = dataArray.map((data) => ({
      ...data,
      createdAt: now,
      updatedAt: now,
    }));
    const result = await collection.insertMany(documents);
    return { insertedCount: result.insertedCount, insertedIds: result.insertedIds };
  }

  static async update(id: string | ObjectId, data: Partial<Omit<ListingProduct, '_id' | 'createdAt'>>) {
    const collection = await getCollection(COLLECTION_NAME);
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    return collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );
  }

  static async delete(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.deleteOne({ _id: queryId as any });
  }

  static async deleteMany(ids: (string | ObjectId)[]) {
    const collection = await getCollection(COLLECTION_NAME);
    const objectIds = ids.map((id) => 
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id
    );
    return collection.deleteMany({ _id: { $in: objectIds as any[] } });
  }

  static async findByCategory(category: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ categories: category }).toArray();
  }

  static async search(searchTerm: string) {
    const collection = await getCollection(COLLECTION_NAME);
    const regex = new RegExp(searchTerm, 'i');
    return collection.find({
      $or: [
        { plant: regex },
        { otherNames: regex },
        { variety: regex },
        { type: regex },
        { finalName: regex },
      ],
    }).toArray();
  }

  static async findWithPagination(
    query: Record<string, unknown> = {},
    page: number = 1,
    limit: number = 20,
    sortField: string = 'createdAt',
    sortOrder: 1 | -1 = -1
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      collection
        .find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async count(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.countDocuments(query);
  }

  static async countBySection(section: ListingSection) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.countDocuments({ section });
  }

  static async updateStatus(id: string | ObjectId, status: ListingStatus) {
    const collection = await getCollection(COLLECTION_NAME);
    let queryId: ObjectId | string = id;
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      queryId = new ObjectId(id);
    }
    return collection.updateOne(
      { _id: queryId as any },
      { $set: { status, updatedAt: new Date() } }
    );
  }

  static async updateStatusMany(ids: (string | ObjectId)[], status: ListingStatus) {
    const collection = await getCollection(COLLECTION_NAME);
    const objectIds = ids.map((id) => 
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id
    );
    return collection.updateMany(
      { _id: { $in: objectIds as any[] } },
      { $set: { status, updatedAt: new Date() } }
    );
  }
}