import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export interface ProductInventory {
  _id?: string;
  name: string;
  price: number;
  sku: string;
  publish: number; // 0 or 1
  sort_order: number;
  inventory_quantity: number;
  substore: string;
  seller: string;
  updatedAt: Date;
  lastUpdatedBy: string;
  source: string;
}

// Helper function to get collection from UrvannSellerApp database
async function getProductInventoryCollection() {
  const client = await clientPromise;
  const db = client.db('UrvannSellerApp');
  return db.collection<ProductInventory>('ProductInventory');
}

export class ProductInventoryModel {
  static async findAll() {
    const collection = await getProductInventoryCollection();
    return collection.find({}).toArray();
  }

  static async findById(id: string) {
    const collection = await getProductInventoryCollection();
    return collection.findOne({ _id: id as any });
  }

  static async findBySku(sku: string) {
    const collection = await getProductInventoryCollection();
    return collection.findOne({ sku });
  }

  static async findBySubstore(substore: string) {
    const collection = await getProductInventoryCollection();
    return collection.find({ substore }).toArray();
  }

  static async findBySeller(seller: string, skip: number = 0, limit: number = 50) {
    const collection = await getProductInventoryCollection();
    // Sort by updatedAt in descending order (most recent first) at database level
    return collection
      .find({ seller })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  static async countBySellerFilter(seller: string) {
    const collection = await getProductInventoryCollection();
    return collection.countDocuments({ seller });
  }

  static async findPublished() {
    const collection = await getProductInventoryCollection();
    return collection.find({ publish: 1 }).toArray();
  }

  static async findWithInventory() {
    const collection = await getProductInventoryCollection();
    return collection.find({ 
      inventory_quantity: { $gt: 0 },
      publish: 1 
    }).toArray();
  }

  static async findBySubstoreAndSeller(substore: string, seller: string) {
    const collection = await getProductInventoryCollection();
    return collection.find({ substore, seller }).toArray();
  }

  static async create(productData: Omit<ProductInventory, '_id' | 'updatedAt'>) {
    const collection = await getProductInventoryCollection();
    
    const product = {
      ...productData,
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(product as any);
    return { ...product, _id: result.insertedId.toString() };
  }

  static async update(id: string, productData: Partial<Omit<ProductInventory, '_id'>>) {
    const collection = await getProductInventoryCollection();
    
    const updateData = {
      ...productData,
      updatedAt: new Date(),
    };
    
    return collection.updateOne(
      { _id: id as any },
      { $set: updateData }
    );
  }

  static async updateBySku(sku: string, productData: Partial<Omit<ProductInventory, '_id' | 'sku'>>) {
    const collection = await getProductInventoryCollection();
    
    const updateData = {
      ...productData,
      updatedAt: new Date(),
    };
    
    return collection.updateOne(
      { sku },
      { $set: updateData }
    );
  }

  static async delete(id: string) {
    const collection = await getProductInventoryCollection();
    return collection.deleteOne({ _id: id as any });
  }

  static async deleteBySku(sku: string) {
    const collection = await getProductInventoryCollection();
    return collection.deleteOne({ sku });
  }

  static async countBySubstore(substore: string) {
    const collection = await getProductInventoryCollection();
    return collection.countDocuments({ substore, publish: 1, inventory_quantity: { $gt: 0 } });
  }

  static async countBySeller(seller: string) {
    const collection = await getProductInventoryCollection();
    return collection.countDocuments({ seller, publish: 1, inventory_quantity: { $gt: 0 } });
  }

  // Search products by name (case-insensitive)
  static async searchByName(searchTerm: string, limit: number = 50) {
    const collection = await getProductInventoryCollection();
    return collection.find({
      name: { $regex: searchTerm, $options: 'i' }
    }).limit(limit).toArray();
  }

  // Get products sorted by sort_order
  static async findSorted(limit?: number) {
    const collection = await getProductInventoryCollection();
    const query = collection.find({}).sort({ sort_order: 1 });
    if (limit) {
      return query.limit(limit).toArray();
    }
    return query.toArray();
  }

  // Get all unique sellers with product counts using aggregation pipeline (database-level)
  static async getAllSellers(skip: number = 0, limit: number = 20) {
    const collection = await getProductInventoryCollection();
    
    // Use MongoDB aggregation pipeline to get all stats in a single query
    const pipeline = [
      {
        $group: {
          _id: '$seller',
          totalProducts: { $sum: 1 },
          publishedProducts: {
            $sum: { $cond: [{ $eq: ['$publish', 1] }, 1, 0] }
          },
          withInventory: {
            $sum: { $cond: [{ $gt: ['$inventory_quantity', 0] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          seller: '$_id',
          totalProducts: 1,
          publishedProducts: 1,
          withInventory: 1
        }
      },
      {
        $sort: { seller: 1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ];
    
    const results = await collection.aggregate(pipeline).toArray();
    return results as Array<{
      seller: string;
      totalProducts: number;
      publishedProducts: number;
      withInventory: number;
    }>;
  }

  // Get total count of unique sellers
  static async getSellersCount() {
    const collection = await getProductInventoryCollection();
    const sellers = await collection.distinct('seller');
    return sellers.length;
  }
}

