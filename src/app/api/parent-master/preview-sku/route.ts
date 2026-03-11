import { NextRequest, NextResponse } from 'next/server';
import { previewParentSKUGlobal } from '@/lib/skuGenerator';

/**
 * GET /api/parent-master/preview-sku?plant=...
 * Returns the next SKU that would be assigned (no hub letter; parent live in all hubs).
 * Preview only: does NOT increment the counter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plant = searchParams.get('plant')?.trim() ?? '';

    if (!plant) {
      return NextResponse.json(
        { success: false, message: 'plant is required' },
        { status: 400 }
      );
    }

    const sku = await previewParentSKUGlobal(plant);
    return NextResponse.json({ success: true, sku });
  } catch (error) {
    console.error('SKU preview failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate SKU preview',
      },
      { status: 422 }
    );
  }
}
