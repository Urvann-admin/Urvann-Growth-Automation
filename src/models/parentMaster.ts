import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import type { ListingProductSEO } from '@/models/listingProduct';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';
import {
  candidateBaseParentSkusForParentListing,
  toCanonicalParentSkuForPurchases,
} from '@/lib/skuGenerator';

export type ProductType = 'parent' | 'growing_product' | 'consumable';

export interface ParentMaster {
  _id?: string | ObjectId;
  /** parent | growing_product | consumable; omitted in DB means parent */
  productType?: ProductType;
  /** procurement_seller_master _id — primary vendor for growing/consumable (Vendor Master list) */
  vendorMasterId?: string;
  /** @deprecated Prefer `sku` for base-parent link on non-parent rows; may exist on older documents */
  parentSku?: string;
  /**
   * User-facing / manual product code.
   * - parent: same value as generated listing sku (set on save; not shown on form).
   * - growing_product / consumable: typed code; unique per product.
   */
  productCode?: string;
  /** Plant name — also used as display name for non-parent types */
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
  /** Size in inches */
  size?: number;
  /** Pot type: bag or pot */
  potType?: string;
  /** Final name: plant + other names + variety + colour + in + size + inch + potType */
  finalName?: string;
  /** Product description (rich text HTML) */
  description?: string;
  /** Array of category aliases (e.g. indoor-plants, outdoor-plants) */
  categories: string[];
  /** Array of collection _ids from collectionMaster (stored in DB); sent to StoreHippo as collection aliases */
  collectionIds?: (string | ObjectId)[];
  /** Selling price of the product (optional in form; default 0 when omitted) */
  sellingPrice?: number;
  /** Compare-at / “was” price for merchandising (optional; `null` in DB means explicitly cleared) */
  compare_at?: number | null;
  /** GST / tax rate: 5% or 18% (stored as `5` or `18`); `null` clears when updating */
  tax?: '5' | '18' | null;
  /** Parent merchandising type: plant vs pot (optional) */
  parentKind?: 'plant' | 'pot';
  /** Store-style SEO (same shape as listing product `SEO`) */
  SEO?: ListingProductSEO;
  /** Listing price: sellingPrice × procurement seller multiplicationFactor (computed on save) */
  listing_price?: number;
  /** AWS S3 image URLs (optional in form; default [] when omitted) */
  images?: string[];
  /** Inventory quantity (optional; used when syncing with listing/StoreHippo) */
  inventory_quantity?: number;
  /** StoreHippo product ID (fetched from StoreHippo API after creation) */
  storeHippoId?: string;
  /** StoreHippo product _id - same as storeHippoId, canonical field for API mapping */
  product_id?: string;
  /** Procurement seller _id from procurement_seller_master (Vendor Master) */
  vendor_id?: string;
  /** Storefront seller: `seller_id` from sellerMaster (resolved from hub substores when creating hub-scoped parents) */
  seller?: string;
  /**
   * Hub name when this row is scoped to one hub (SKU from `generateParentSKU(hub, plant)`).
   * Omitted for legacy/global parent rows (SKU from `generateParentSKUGlobal`).
   */
  hub?: string;
  /**
   * For base `parent` rows: generated listing SKU (same as `productCode`).
   * For `growing_product` / `consumable`: SKU string of the linked base parent (not the typed product code).
   */
  sku?: string;
  /** Substores derived from hub mapping (e.g. bgl-e, bgl-e2 for Whitefield) */
  substores?: string[];
  /** Product features (dropdown selection) */
  features?: string;
  /** Redirects (dropdown selection) */
  redirects?: string;
  /** @deprecated Use potType */
  type?: string;
  /** @deprecated Use sellingPrice */
  price?: number;
  /** Type breakdown from purchase (Listing, Revival, Growth, Consumers) – updated when saving purchase master. Stored as object "type" in DB. */
  typeBreakdown?: PurchaseTypeBreakdown;
  /**
   * When true, this base parent is hidden from the split-screen **parent listing** queue (already has a parent-type listing).
   * Set on listing create; cleared when the last parent-type listing for this canonical SKU is removed.
   */
  isListed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Legacy documents without `productType` are treated as parent (base plant) rows. */
export function isBaseParent(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false;
  const pt = (doc as { productType?: ProductType }).productType;
  return pt === undefined || pt === 'parent';
}

const COLLECTION_NAME = 'parentMaster';

export class ParentMasterModel {
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

  static async findByPlant(plant: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ plant });
  }

  /**
   * Resolve by `sku`. When multiple documents share the same `sku` (e.g. non-parent rows that store their
   * base parent’s SKU), returns the **base parent** row first so purchase/listing logic stays correct.
   */
  static async findBySku(sku: string) {
    const collection = await getCollection(COLLECTION_NAME);
    const trimmed = String(sku).trim();
    if (!trimmed) return null;
    const base = await collection.findOne({
      sku: trimmed,
      $or: [{ productType: { $exists: false } }, { productType: 'parent' }],
    });
    if (base) return base;
    return collection.findOne({ sku: trimmed });
  }

  /**
   * Resolve which Parent Master row to update for inventory sync: exact SKU, then canonical / candidate
   * variants (hub-prefixed listing line + global parent row, or hub-scoped parent row).
   */
  static async findBaseParentForInventorySync(
    hub: string | undefined,
    lineOrPurchaseSku: string
  ): Promise<ParentMaster | null> {
    const raw = String(lineOrPurchaseSku ?? '').trim();
    if (!raw) return null;

    const trySku = async (s: string) => {
      const doc = await this.findBySku(s);
      return doc && isBaseParent(doc) ? (doc as ParentMaster) : null;
    };

    const direct = await trySku(raw);
    if (direct) return direct;

    const candidates = new Set<string>(candidateBaseParentSkusForParentListing(raw, hub));
    const h = hub?.trim();
    if (h) {
      const canon = toCanonicalParentSkuForPurchases('parent', h, raw);
      if (canon) candidates.add(canon);
    }
    for (const c of candidates) {
      if (!c || c === raw) continue;
      const doc = await trySku(c);
      if (doc) return doc;
    }
    return null;
  }

  static async findByProductCode(productCode: string) {
    const collection = await getCollection(COLLECTION_NAME);
    const trimmed = String(productCode).trim();
    if (!trimmed) return null;
    return collection.findOne({ productCode: trimmed });
  }

  static async create(data: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async createMany(dataArray: Omit<ParentMaster, '_id' | 'createdAt' | 'updatedAt'>[]) {
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

  static async update(id: string | ObjectId, data: Partial<Omit<ParentMaster, '_id' | 'createdAt'>>) {
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
    const trimmed = String(searchTerm).trim();
    return collection.find({
      $or: [
        { plant: regex },
        { otherNames: regex },
        { variety: regex },
        { potType: regex },
        { type: regex },
        { productCode: regex },
        ...(trimmed ? [{ sku: trimmed }] : []),
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
}
