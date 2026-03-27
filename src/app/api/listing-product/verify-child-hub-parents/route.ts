import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import type { ListingProduct, ListingSection } from '@/models/listingProduct';
import { expectedParentSkuForHub } from '@/lib/childListingHubSku';

const LISTING_PRODUCT_COLLECTION = 'listingProduct';

type CheckInput = { hub: string; canonicalParentSku: string };

/**
 * POST /api/listing-product/verify-child-hub-parents
 * Batch check: for each (hub, canonical base parent SKU), whether a listing product exists
 * in the section whose top-level `sku` matches the expected hub-prefixed parent SKU.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      section?: string;
      checks?: CheckInput[];
    };

    const section = body.section?.trim();
    if (!section || !['listing', 'revival', 'growth', 'consumer'].includes(section)) {
      return NextResponse.json(
        { success: false, message: 'section is required and must be a valid ListingSection' },
        { status: 400 }
      );
    }

    const rawChecks = Array.isArray(body.checks) ? body.checks : [];
    const normalized: { hub: string; canonicalParentSku: string; expectedSku: string }[] = [];
    const seen = new Set<string>();

    for (const c of rawChecks) {
      const hub = String(c?.hub ?? '').trim();
      const canonicalParentSku = String(c?.canonicalParentSku ?? '').trim();
      if (!hub || !canonicalParentSku) continue;
      const expectedSku = expectedParentSkuForHub(hub, canonicalParentSku);
      if (!expectedSku) {
        normalized.push({ hub, canonicalParentSku, expectedSku: '' });
        continue;
      }
      const key = `${hub}\0${canonicalParentSku}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({ hub, canonicalParentSku, expectedSku });
    }

    const expectedSkus = [
      ...new Set(normalized.map((n) => n.expectedSku).filter(Boolean)),
    ] as string[];

    const found = new Set<string>();
    if (expectedSkus.length > 0) {
      const collection = await getCollection(LISTING_PRODUCT_COLLECTION);
      const cursor = collection.find({
        section: section as ListingSection,
        sku: { $in: expectedSkus },
      });
      const docs = await cursor.toArray();
      for (const raw of docs) {
        const doc = raw as unknown as ListingProduct;
        const s = String(doc.sku ?? '').trim();
        if (s && expectedSkus.includes(s)) found.add(s);
      }
    }

    const results = normalized.map(({ hub, canonicalParentSku, expectedSku }) => ({
      hub,
      canonicalParentSku,
      expectedSku,
      exists: Boolean(expectedSku && found.has(expectedSku)),
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('[verify-child-hub-parents] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
