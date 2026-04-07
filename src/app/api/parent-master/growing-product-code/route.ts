import { NextRequest, NextResponse } from 'next/server';
import { ProcurementSellerMasterModel } from '@/models/procurementSellerMaster';
import { peekNextGrowingProductCode } from '@/lib/growingProductCodeSequence';
import { GrowingProductCodeError } from '@/lib/growingProductCode';

/**
 * GET — preview next growing-product code (does not consume sequence).
 * Query: plant, vendorMasterId, parentSku (base parent listing SKU).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plant = String(searchParams.get('plant') ?? '').trim();
    const vendorMasterId = String(searchParams.get('vendorMasterId') ?? '').trim();
    const parentSku = String(searchParams.get('parentSku') ?? '').trim();

    if (!plant) {
      return NextResponse.json({ success: false, message: 'plant is required' }, { status: 400 });
    }
    if (!vendorMasterId) {
      return NextResponse.json({ success: false, message: 'vendorMasterId is required' }, { status: 400 });
    }
    if (!parentSku) {
      return NextResponse.json({ success: false, message: 'parentSku is required' }, { status: 400 });
    }

    const vendor = await ProcurementSellerMasterModel.findById(vendorMasterId);
    const vendorName = vendor?.seller_name != null ? String(vendor.seller_name).trim() : '';
    if (!vendor || !vendorName) {
      return NextResponse.json({ success: false, message: 'Primary vendor not found' }, { status: 400 });
    }

    const { prefix, productCodePreview } = await peekNextGrowingProductCode({
      plant,
      vendorName,
      parentSku,
    });

    return NextResponse.json({ success: true, prefix, productCodePreview });
  } catch (err) {
    if (err instanceof GrowingProductCodeError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 422 });
    }
    console.error('growing-product-code GET:', err);
    return NextResponse.json({ success: false, message: 'Failed to preview product code' }, { status: 500 });
  }
}
