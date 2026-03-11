import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

/** Section types for listing products */
export type ListingSection = 'listing' | 'revival' | 'growth' | 'consumer';

/** Status types for listing products */
export type ListingStatus = 'draft' | 'listed' | 'published';

/**
 * Snapshot of how a listing line item is composed from parent SKUs.
 *
 * - `parentSku` – SKU of the parent in `parentMaster`
 * - `quantity`  – how many units of this parent are used per ONE set of the
 *                 final listing product
 * - `unitPrice` – price of the parent at the time of listing creation
 */
export interface ListingParentItem {
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
  /** Which section this belongs to */
  section: ListingSection;
  /** Listing status */
  status: ListingStatus;
  /** Procurement seller _id from procurement_seller_master */
  seller?: string;
  /** Hub name (e.g. Whitefield, HSR) for inventory/listing scope */
  hub?: string;
  /** Substores derived from hub mapping */
  substores?: string[];
  /** Product tag (e.g. Bestseller, New Arrival) */
  tag?: string;
  /** Compare-at price shown as original/strikethrough price */
  compare_at_price?: number;
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

  static async findByStatus(status: ListingStatus) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ status }).toArray();
  }

  static async findByParentSku(parentSku: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ 'parentItems.parentSku': parentSku }).toArray();
  }

  static async findByParentSkus(parentSkus: string[]) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({ 'parentItems.parentSku': { $in: parentSkus } }).toArray();
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

  static async countByStatus(status: ListingStatus) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.countDocuments({ status });
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