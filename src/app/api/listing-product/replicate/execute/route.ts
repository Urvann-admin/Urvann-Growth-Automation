import { NextRequest, NextResponse } from 'next/server';
import type { ListingSection } from '@/models/listingProduct';
import {
  buildPreflightResult,
  executeReplication,
  loadProductsByIds,
  normalizeHubs,
} from '../helpers';

type ExecuteRequestBody = {
  section?: ListingSection;
  productIds?: string[];
  targetHubs?: string[];
};

const VALID_SECTIONS: ListingSection[] = ['listing', 'revival', 'growth', 'consumer'];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExecuteRequestBody;
    const section = body.section;
    const productIds = Array.isArray(body.productIds) ? body.productIds : [];
    const targetHubs = normalizeHubs(Array.isArray(body.targetHubs) ? body.targetHubs : []);

    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json({ success: false, message: 'Invalid section' }, { status: 400 });
    }
    if (productIds.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one product is required' }, { status: 400 });
    }
    if (targetHubs.length === 0) {
      return NextResponse.json({ success: false, message: 'Select at least one target hub' }, { status: 400 });
    }

    const selectedProducts = await loadProductsByIds(section, productIds);
    if (selectedProducts.length === 0) {
      return NextResponse.json({ success: false, message: 'No matching products found' }, { status: 404 });
    }

    const preflight = await buildPreflightResult(section, selectedProducts, targetHubs);
    const execution = await executeReplication(section, selectedProducts, preflight);

    return NextResponse.json({
      success: true,
      data: {
        preflight,
        execution,
      },
    });
  } catch (error) {
    console.error('[replicate/execute] POST error', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Replication failed' },
      { status: 500 }
    );
  }
}
