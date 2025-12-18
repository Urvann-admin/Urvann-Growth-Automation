import mongoose, { Schema, Document } from 'mongoose';
import { connectDB } from '@/lib/mongodb';

// Item interface
export interface IOrderItem {
  sku: string;
  name: string;
  quantity: number;
}

// FrequentlyBought document interface
export interface IFrequentlyBought extends Document {
  txn_id: string;
  order_id: string;
  substore: string;
  order_created_at: Date;
  items: IOrderItem[];
}

// Define the schema
const OrderItemSchema = new Schema<IOrderItem>(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const FrequentlyBoughtSchema = new Schema<IFrequentlyBought>(
  {
    txn_id: { type: String, required: true, index: true },
    order_id: { type: String, required: true },
    substore: { type: String, required: true },
    order_created_at: { type: Date, required: true },
    items: { type: [OrderItemSchema], required: true },
  },
  {
    collection: 'frequentlyBought',
    timestamps: false,
  }
);

// Create indexes for efficient querying
FrequentlyBoughtSchema.index({ 'items.sku': 1 });
FrequentlyBoughtSchema.index({ substore: 1 });
FrequentlyBoughtSchema.index({ order_created_at: -1 });
FrequentlyBoughtSchema.index({ channel: 1 }); // For filtering admin orders
// Compound indexes for common query patterns
FrequentlyBoughtSchema.index({ channel: 1, substore: 1 });
FrequentlyBoughtSchema.index({ channel: 1, 'items.sku': 1 });

// Static methods for the model
FrequentlyBoughtSchema.statics.getAllUniqueSKUs = async function (): Promise<
  { sku: string; name: string; count: number }[]
> {
  await connectDB();

  const result = await this.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.sku',
        name: { $first: '$items.name' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        sku: '$_id',
        name: 1,
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  return result;
};

// Optimized method to calculate frequently bought together for all SKUs
FrequentlyBoughtSchema.statics.calculateFrequentlyBoughtTogether = async function (
  limit: number = 10
): Promise<Map<string, { sku: string; name: string; count: number }[]>> {
  await connectDB();

  // Use aggregation pipeline to find co-occurrences efficiently
  const coOccurrences = await this.aggregate([
    // Unwind items to work with individual products
    { $unwind: '$items' },
    // Group by txn_id to get all items per transaction
    {
      $group: {
        _id: '$txn_id',
        items: { $push: { sku: '$items.sku', name: '$items.name' } },
      },
    },
    // Only consider transactions with 2+ items
    { $match: { 'items.1': { $exists: true } } },
    // Self-join to create pairs
    { $unwind: { path: '$items', includeArrayIndex: 'idx1' } },
    {
      $lookup: {
        from: 'frequentlyBought',
        let: { txnId: '$_id', currentSku: '$items.sku' },
        pipeline: [
          { $match: { $expr: { $eq: ['$txn_id', '$$txnId'] } } },
          { $unwind: '$items' },
          { $match: { $expr: { $ne: ['$items.sku', '$$currentSku'] } } },
          { $project: { sku: '$items.sku', name: '$items.name' } },
        ],
        as: 'pairedItems',
      },
    },
    { $unwind: '$pairedItems' },
    // Group to count co-occurrences
    {
      $group: {
        _id: {
          sku1: '$items.sku',
          sku2: '$pairedItems.sku',
        },
        name1: { $first: '$items.name' },
        name2: { $first: '$pairedItems.name' },
        count: { $sum: 1 },
      },
    },
    // Sort by count for ranking
    { $sort: { '_id.sku1': 1, count: -1 } },
    // Group by sku1 and get top N paired items
    {
      $group: {
        _id: '$_id.sku1',
        name: { $first: '$name1' },
        topPaired: {
          $push: {
            sku: '$_id.sku2',
            name: '$name2',
            count: '$count',
          },
        },
      },
    },
    // Limit the paired items array
    {
      $project: {
        _id: 0,
        sku: '$_id',
        name: 1,
        topPaired: { $slice: ['$topPaired', limit] },
      },
    },
    { $sort: { sku: 1 } },
  ]);

  // Convert to Map
  const resultMap = new Map<string, { sku: string; name: string; count: number }[]>();
  coOccurrences.forEach((item: { sku: string; topPaired: { sku: string; name: string; count: number }[] }) => {
    resultMap.set(item.sku, item.topPaired);
  });

  return resultMap;
};

// Optimized single aggregation for frequently bought together
FrequentlyBoughtSchema.statics.getFrequentlyBoughtTogetherOptimized = async function (
  limit: number = 10,
  page: number = 1,
  pageSize: number = 50
): Promise<{
  data: { sku: string; name: string; topPaired: { sku: string; name: string; count: number }[] }[];
  totalSkus: number;
  totalPages: number;
}> {
  await connectDB();

  // First, get all unique SKUs to establish the count
  const skuCountPipeline = [
    { $unwind: '$items' },
    { $group: { _id: '$items.sku' } },
    { $count: 'total' },
  ];

  const countResult = await this.aggregate(skuCountPipeline);
  const totalSkus = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(totalSkus / pageSize);

  // Main pipeline for frequently bought together analysis
  const pipeline = [
    // Step 1: Unwind items and group by transaction
    { $unwind: '$items' },
    {
      $group: {
        _id: '$txn_id',
        items: {
          $addToSet: {
            sku: '$items.sku',
            name: '$items.name',
          },
        },
      },
    },
    // Step 2: Filter transactions with 2+ unique items
    {
      $match: {
        'items.1': { $exists: true },
      },
    },
    // Step 3: Create all pairs within each transaction
    {
      $project: {
        pairs: {
          $reduce: {
            input: { $range: [0, { $size: '$items' }] },
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value',
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $range: [0, { $size: '$items' }] },
                        as: 'j',
                        cond: { $ne: ['$$this', '$$j'] },
                      },
                    },
                    as: 'j',
                    in: {
                      sku1: { $arrayElemAt: ['$items.sku', '$$this'] },
                      name1: { $arrayElemAt: ['$items.name', '$$this'] },
                      sku2: { $arrayElemAt: ['$items.sku', '$$j'] },
                      name2: { $arrayElemAt: ['$items.name', '$$j'] },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
    // Step 4: Unwind pairs
    { $unwind: '$pairs' },
    // Step 5: Group by pair to count occurrences
    {
      $group: {
        _id: {
          sku1: '$pairs.sku1',
          sku2: '$pairs.sku2',
        },
        name1: { $first: '$pairs.name1' },
        name2: { $first: '$pairs.name2' },
        count: { $sum: 1 },
      },
    },
    // Step 6: Sort by sku1 and count
    { $sort: { '_id.sku1': 1, count: -1 } as Record<string, 1 | -1> },
    // Step 7: Group by sku1 to collect top paired items
    {
      $group: {
        _id: '$_id.sku1',
        name: { $first: '$name1' },
        topPaired: {
          $push: {
            sku: '$_id.sku2',
            name: '$name2',
            count: '$count',
          },
        },
      },
    },
    // Step 8: Limit topPaired array and sort
    {
      $project: {
        _id: 0,
        sku: '$_id',
        name: 1,
        topPaired: { $slice: ['$topPaired', limit] },
      },
    },
    { $sort: { sku: 1 } as Record<string, 1 | -1> },
    // Step 9: Pagination
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
  ];

  const data = await this.aggregate(pipeline);

  return {
    data,
    totalSkus,
    totalPages,
  };
};

// Interface for the model with static methods
export interface IFrequentlyBoughtModel extends mongoose.Model<IFrequentlyBought> {
  getAllUniqueSKUs(): Promise<{ sku: string; name: string; count: number }[]>;
  calculateFrequentlyBoughtTogether(
    limit?: number
  ): Promise<Map<string, { sku: string; name: string; count: number }[]>>;
  getFrequentlyBoughtTogetherOptimized(
    limit?: number,
    page?: number,
    pageSize?: number
  ): Promise<{
    data: { sku: string; name: string; topPaired: { sku: string; name: string; count: number }[] }[];
    totalSkus: number;
    totalPages: number;
  }>;
}

// Create or get the model
export const FrequentlyBoughtModel =
  (mongoose.models.FrequentlyBought as IFrequentlyBoughtModel) ||
  mongoose.model<IFrequentlyBought, IFrequentlyBoughtModel>('FrequentlyBought', FrequentlyBoughtSchema);


