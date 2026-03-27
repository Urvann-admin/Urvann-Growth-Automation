import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface ProcurementSellerMaster {
  _id?: string | ObjectId;
  /** Unique vendor code: slug(name) + 4-digit increment */
  vendorCode?: string;
  /** Name of the seller/vendor */
  seller_name: string;
  /** Vendor place / location */
  place?: string;
  /** Multiplication factor (e.g. for pricing or quantity) */
  multiplicationFactor?: number;
  /** Product types: Product, saplings, consumables */
  productType?: string[];
  /** Phone number */
  phoneNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'procurement_seller_master';

export class ProcurementSellerMasterModel {
  static async findAll(query: Record<string, unknown> = {}) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find(query).toArray();
  }

  static async findById(id: string | ObjectId) {
    const collection = await getCollection(COLLECTION_NAME);
    const queryId =
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    return collection.findOne({ _id: queryId as ObjectId });
  }

  static async create(
    data: Omit<ProcurementSellerMaster, '_id' | 'createdAt' | 'updatedAt'>
  ) {
    const collection = await getCollection(COLLECTION_NAME);
    const document = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async update(
    id: string | ObjectId,
    data: Partial<Omit<ProcurementSellerMaster, '_id' | 'createdAt'>>
  ) {
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
    const queryId =
      typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id;
    return collection.deleteOne({ _id: queryId as ObjectId });
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

  /**
   * Resolve CSV/UI input to the canonical procurement seller document _id (string).
   * Tries: Mongo _id, vendorCode, seller_name (exact), seller_name (case-insensitive).
   */
  static async resolveToStoredSellerRef(raw: string): Promise<string | null> {
    const t = String(raw ?? '').trim();
    if (!t) return null;
    const collection = await getCollection(COLLECTION_NAME);

    if (ObjectId.isValid(t)) {
      const byId = await collection.findOne({ _id: new ObjectId(t) });
      if (byId?._id) return String(byId._id);
    }

    const byVendor = await collection.findOne({ vendorCode: t });
    if (byVendor?._id) return String(byVendor._id);

    const byName = await collection.findOne({ seller_name: t });
    if (byName?._id) return String(byName._id);

    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const byNameCi = await collection.findOne({
      seller_name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });
    if (byNameCi?._id) return String(byNameCi._id);

    return null;
  }
}
