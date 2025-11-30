import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export interface FieldChange {
  oldValue: any;
  newValue: any;
}

export interface ProductInventoryAuditLog {
  _id?: string | ObjectId;
  productId: string | ObjectId;
  sku: string;
  operationType: string;
  previousDocument: any | null;
  updatedDocument: any;
  changedFields: string[];
  fieldChanges: Record<string, FieldChange>;
  updateDescription: string;
  updatedBy: string;
  lastFieldUpdated: string;
  resumeToken: string;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}

// Helper function to get collection from UrvannSellerApp database
async function getProductInventoryAuditLogCollection() {
  const client = await clientPromise;
  const db = client.db('UrvannSellerApp');
  return db.collection<ProductInventoryAuditLog>('ProductInventoryAuditLog');
}

export class ProductInventoryAuditLogModel {
  static async findAll() {
    const collection = await getProductInventoryAuditLogCollection();
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  static async findById(id: string | ObjectId) {
    const collection = await getProductInventoryAuditLogCollection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return collection.findOne({ _id: objectId });
  }

  static async findByProductId(productId: string | ObjectId, limit: number = 50) {
    const collection = await getProductInventoryAuditLogCollection();
    const objectId = typeof productId === 'string' ? new ObjectId(productId) : productId;
    return collection
      .find({ productId: objectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async findBySku(sku: string, limit: number = 50) {
    const collection = await getProductInventoryAuditLogCollection();
    return collection
      .find({ sku })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async findByOperationType(operationType: string, limit: number = 50) {
    const collection = await getProductInventoryAuditLogCollection();
    return collection
      .find({ operationType })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async findByUpdatedBy(updatedBy: string, limit: number = 50) {
    const collection = await getProductInventoryAuditLogCollection();
    return collection
      .find({ updatedBy })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async create(auditLogData: Omit<ProductInventoryAuditLog, '_id' | 'createdAt' | 'updatedAt' | '__v'>) {
    const collection = await getProductInventoryAuditLogCollection();
    
    const auditLog = {
      ...auditLogData,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    };
    
    const result = await collection.insertOne(auditLog as any);
    return { ...auditLog, _id: result.insertedId };
  }

  static async update(id: string | ObjectId, auditLogData: Partial<Omit<ProductInventoryAuditLog, '_id' | 'createdAt' | '__v'>>) {
    const collection = await getProductInventoryAuditLogCollection();
    
    // Convert string ID to ObjectId if needed
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const updateData = {
      ...auditLogData,
      updatedAt: new Date(),
    };
    
    return collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );
  }

  static async delete(id: string | ObjectId) {
    const collection = await getProductInventoryAuditLogCollection();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return collection.deleteOne({ _id: objectId });
  }

  static async countByProductId(productId: string | ObjectId) {
    const collection = await getProductInventoryAuditLogCollection();
    const objectId = typeof productId === 'string' ? new ObjectId(productId) : productId;
    return collection.countDocuments({ productId: objectId });
  }

  static async countBySku(sku: string) {
    const collection = await getProductInventoryAuditLogCollection();
    return collection.countDocuments({ sku });
  }

  static async countByOperationType(operationType: string) {
    const collection = await getProductInventoryAuditLogCollection();
    return collection.countDocuments({ operationType });
  }

  static async findRecent(limit: number = 100) {
    const collection = await getProductInventoryAuditLogCollection();
    return collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async findByDateRange(startDate: Date, endDate: Date, limit: number = 100) {
    const collection = await getProductInventoryAuditLogCollection();
    return collection
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }
}

