import { NextRequest, NextResponse } from 'next/server';
import { SellerMasterModel } from '@/models/sellerMaster';

/** Resolve `sellerMaster.seller_id` for a hub via substore codes (see HUB_MAPPINGS). */
export async function GET(request: NextRequest) {
  try {
    const hub = request.nextUrl.searchParams.get('hub')?.trim() ?? '';
    if (!hub) {
      return NextResponse.json(
        { success: false, message: 'hub query parameter is required' },
        { status: 400 }
      );
    }
    const seller_id = await SellerMasterModel.resolveStorefrontSellerIdForHub(hub);
    return NextResponse.json({
      success: true,
      hub,
      seller_id: seller_id ?? null,
    });
  } catch (error) {
    console.error('[sellers/by-hub]', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resolve seller for hub' },
      { status: 500 }
    );
  }
}
