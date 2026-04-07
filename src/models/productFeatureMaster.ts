import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

export interface ProductFeatureMaster {
  _id?: string | ObjectId;
  /** Canonical display / storage text */
  name: string;
  /** Lowercase trimmed — unique lookup */
  nameLower: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION_NAME = 'product_feature_master';

/** Split parent `features` CSV into distinct trimmed tokens. */
export function parseFeatureTokens(features: string | undefined | null): string[] {
  if (features == null || typeof features !== 'string') return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of features.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export class ProductFeatureMasterModel {
  static async findAllSorted(): Promise<ProductFeatureMaster[]> {
    const collection = await getCollection(COLLECTION_NAME);
    const items = await collection
      .find({})
      .sort({ nameLower: 1 })
      .toArray();
    return items as ProductFeatureMaster[];
  }

  /**
   * Upsert each name (case-insensitive unique on nameLower).
   * Preserves first-seen casing in DB on insert.
   */
  static async ensureNames(rawNames: string[]): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME);
    const seen = new Set<string>();
    for (const raw of rawNames) {
      const name = String(raw ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const now = new Date();
      await collection.updateOne(
        { nameLower: key },
        {
          $setOnInsert: { name, nameLower: key, createdAt: now },
          $set: { updatedAt: now },
        },
        { upsert: true }
      );
    }
  }

  /** Persist all tokens from a parent features string. */
  static async ensureFromFeaturesField(features: string | undefined | null): Promise<void> {
    const tokens = parseFeatureTokens(features ?? undefined);
    if (tokens.length === 0) return;
    await ProductFeatureMasterModel.ensureNames(tokens);
  }
}
