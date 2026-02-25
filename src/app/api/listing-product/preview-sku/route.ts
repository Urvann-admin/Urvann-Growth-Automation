import { NextRequest, NextResponse } from 'next/server';
import { previewListingSKU } from '@/lib/skuGenerator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hub = searchParams.get('hub')?.trim();
    const plant = searchParams.get('plant')?.trim();
    const setQuantity = Math.max(1, Math.min(99, parseInt(searchParams.get('setQuantity') || '1', 10)));

    if (!hub || !plant) {
      return NextResponse.json(
        { success: false, message: 'hub and plant are required' },
        { status: 400 }
      );
    }

    const sku = await previewListingSKU(hub, plant, setQuantity);
    return NextResponse.json({ success: true, sku });
  } catch (error) {
    console.error('Preview SKU failed:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Preview SKU failed' },
      { status: 400 }
    );
  }
}
