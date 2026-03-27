import { NextRequest, NextResponse } from 'next/server';
import type { ListingSection } from '@/models/listingProduct';
import {
  buildPreflightResultForRetryPairs,
  executeReplication,
  loadProductsByIds,
  type RetryPair,
} from '../helpers';

type RetryRequestBody = {
  section?: ListingSection;
  retryPairs?: RetryPair[];
};

const VALID_SECTIONS: ListingSection[] = ['listing', 'revival', 'growth', 'consumer'];

function normalizeRetryPairs(raw: unknown): RetryPair[] {
  if (!Array.isArray(raw)) return [];
  const out: RetryPair[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const productId = String((item as RetryPair).productId ?? '').trim();
    const hub = String((item as RetryPair).hub ?? '').trim();
    if (!productId || !hub) continue;
    const key = `${productId}\0${hub}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ productId, hub });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RetryRequestBody;
    const section = body.section;
    const retryPairs = normalizeRetryPairs(body.retryPairs);

    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json({ success: false, message: 'Invalid section' }, { status: 400 });
    }
    if (retryPairs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one product–hub retry pair is required' },
        { status: 400 }
      );
    }

    const productIds = [...new Set(retryPairs.map((p) => p.productId))];
    const selectedProducts = await loadProductsByIds(section, productIds);
    if (selectedProducts.length === 0) {
      return NextResponse.json({ success: false, message: 'No matching products found' }, { status: 404 });
    }

    const preflight = await buildPreflightResultForRetryPairs(section, selectedProducts, retryPairs);
    const execution = await executeReplication(section, selectedProducts, preflight);

    return NextResponse.json({
      success: true,
      data: {
        preflight,
        execution,
      },
    });
  } catch (error) {
    console.error('[replicate/retry] POST error', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Retry replication failed' },
      { status: 500 }
    );
  }
}
