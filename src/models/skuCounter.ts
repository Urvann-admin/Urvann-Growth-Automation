import type { Document } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface SkuCounter {
  _id?: string;
  hub: string;
  counter: number;
  lastUpdated: Date;
}

const COLLECTION_NAME = 'skuCounters';

export class SkuCounterModel {
  /**
   * Increments the counter for this document `hub` key and returns the new value.
   * When the document is first created, counter becomes `seedFloorIfNew + 1` (default 1).
   * Use `seedFloorIfNew` to continue from a legacy per-hub counter when introducing scoped keys.
   */
  static async getNextCounter(hubKey: string, seedFloorIfNew: number = 0): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME);
    const floor = seedFloorIfNew;

    const result = await collection.findOneAndUpdate(
      { hub: hubKey },
      [
        { $set: { hub: hubKey, lastUpdated: new Date() } },
        { $set: { counter: { $add: [{ $ifNull: ['$counter', floor] }, 1] } } },
      ] as Document[],
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    const doc = result as { counter?: number } | null;
    return doc?.counter ?? 1;
  }

  /** Read-only: returns current counter without incrementing. Use for SKU preview only. */
  static async getCurrentCounter(hub: string): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME);
    const doc = await collection.findOne({ hub });
    return doc?.counter ?? 0;
  }

  static async resetCounter(hub: string, value: number = 0): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME);
    await collection.updateOne(
      { hub },
      { 
        $set: { 
          counter: value,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
  }

  static async getAllCounters(): Promise<SkuCounter[]> {
    const collection = await getCollection(COLLECTION_NAME);
    return collection.find({}).toArray() as unknown as Promise<SkuCounter[]>;
  }
}
