import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';

export interface ParentMaster {
  _id?: string | ObjectId;
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
  /** Procurement seller _id from procurement_seller_master */
  seller?: string;
  /** Hub name (optional; when parent is live in all hubs, SKU has no hub letter) */
  hub?: string;
  /** Single SKU for this product (no hub prefix when live in all hubs) */
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
  createdAt?: Date;
  updatedAt?: Date;
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

  static async findBySku(sku: string) {
    const collection = await getCollection(COLLECTION_NAME);
    const trimmed = String(sku).trim();
    if (!trimmed) return null;
    return collection.findOne({ sku: trimmed });
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
