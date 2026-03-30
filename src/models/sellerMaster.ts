import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { getSubstoresByHub } from '@/shared/constants/hubs';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SellerMaster {
  _id?: string | ObjectId;
  /** Name of the seller */
  seller_name: string;
  /** Unique identifier for the seller */
  seller_id: string;
  /**
   * Substore keys that map to hubs (same keys as hub → substore mapping).
   * Used to pick the storefront seller when a parent row is created for a hub.
   */
  substores?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'sellerMaster';

export class SellerMasterModel {
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

  static async findBySellerId(sellerId: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ seller_id: sellerId });
  }

  static async findBySellerName(sellerName: string) {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.findOne({ seller_name: sellerName });
  }

  /**
   * Resolves StoreHippo `seller_id` for a storefront hub by matching `seller_id` to hub substores
   * (in `HUB_MAPPINGS` order). Use for child listing: one document per hub should use that hub’s seller.
   */
  static async findSellerIdForHub(hub: string): Promise<string | null> {
    const h = String(hub ?? '').trim();
    if (!h) return null;
    const substores = getSubstoresByHub(h);
    if (substores.length === 0) return null;
    const collection = await getCollection(COLLECTION_NAME);
    for (const sub of substores) {
      const subTrim = String(sub).trim();
      if (!subTrim) continue;
      let doc = await collection.findOne({ seller_id: subTrim });
      if (!doc) {
        doc = await collection.findOne({
          seller_id: { $regex: new RegExp(`^${escapeRegex(subTrim)}$`, 'i') },
        });
      }
      const sid = doc && (doc as SellerMaster).seller_id != null ? String((doc as SellerMaster).seller_id).trim() : '';
      if (sid) return sid;
    }
    return null;
  }

  /** First seller whose `substores` overlaps hub substores (e.g. Whitefield → bgl-e, bgl-e2). */
  static async findForHub(hubName: string): Promise<SellerMaster | null> {
    const hub = String(hubName ?? '').trim();
    if (!hub) return null;
    const hubSubstores = getSubstoresByHub(hub);
    if (hubSubstores.length === 0) return null;
    const collection = await getCollection(COLLECTION_NAME);
    const doc = await collection.findOne({
      substores: { $in: hubSubstores },
    });
    return doc as SellerMaster | null;
  }

  /** Prefer `substores` overlap; fall back to legacy `findSellerIdForHub` (seller_id matches substore code). */
  static async resolveStorefrontSellerIdForHub(hubName: string): Promise<string | null> {
    const fromDoc = await this.findForHub(hubName);
    const sid = fromDoc?.seller_id?.trim();
    if (sid) return sid;
    return this.findSellerIdForHub(hubName);
  }

  static async create(data: Omit<SellerMaster, '_id' | 'createdAt' | 'updatedAt'>) {
    const collection = await getCollection(COLLECTION_NAME);
    const document: any = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  static async update(id: string | ObjectId, data: Partial<Omit<SellerMaster, '_id' | 'createdAt'>>) {
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
}
