import { NextRequest, NextResponse } from 'next/server';
import { resolveParentSkuFromCode } from '@/lib/resolveParentSkuFromCode';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get('productCode')?.trim() ?? '';
    const hub = searchParams.get('hub')?.trim() ?? '';

    const result = await resolveParentSkuFromCode(productCode, hub);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      parentSku: result.parentSku,
      productType: result.productType,
      vendorId: result.vendorId ?? null,
    });
  } catch (error) {
    console.error('[purchase-master/resolve-parent-sku] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resolve parent SKU',
      },
      { status: 500 }
    );
  }
}
