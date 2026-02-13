import { NextRequest, NextResponse } from 'next/server';
import { previewParentSKU } from '@/lib/skuGenerator';

/**
 * GET /api/parent-master/preview-sku?hub=...&plant=...
 * Returns the next SKU that would be assigned for the given hub and plant.
 * Preview only: does NOT increment the counter. The counter is incremented
 * only when the product is created via POST /api/parent-master.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hub = searchParams.get('hub')?.trim() ?? '';
    const plant = searchParams.get('plant')?.trim() ?? '';

    if (!hub || !plant) {
      return NextResponse.json(
        { success: false, message: 'hub and plant are required' },
        { status: 400 }
      );
    }

    const sku = await previewParentSKU(hub, plant);
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
