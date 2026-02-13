import { getCollection } from '@/lib/mongodb';

export interface SkuCounter {
  _id?: string;
  hub: string;
  counter: number;
  lastUpdated: Date;
}

const COLLECTION_NAME = 'skuCounters';

export class SkuCounterModel {
  static async getNextCounter(hub: string): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME);
    
    const result = await collection.findOneAndUpdate(
      { hub },
      { 
        $inc: { counter: 1 },
        $set: { lastUpdated: new Date() }
      },
      { 
        upsert: true,
        returnDocument: 'after'
      }
    );

    return result?.counter ?? 1;
  }

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
    return collection.find({}).toArray() as Promise<SkuCounter[]>;
  }
}
