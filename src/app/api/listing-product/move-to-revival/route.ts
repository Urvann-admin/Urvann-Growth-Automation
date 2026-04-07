import { NextRequest, NextResponse } from 'next/server';
import { moveListingProductsToRevival } from '@/app/api/listing-product/moveToRevivalCore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawIds = body?.listingProductIds ?? body?.ids;
    const ids: string[] = Array.isArray(rawIds)
      ? rawIds.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: 'listingProductIds (or ids) must be a non-empty array' },
        { status: 400 }
      );
    }

    const { moved, failed } = await moveListingProductsToRevival(ids);

    return NextResponse.json({
      success: failed.length === 0,
      moved,
      failed,
      message:
        failed.length === 0
          ? `Moved ${moved} product(s) to Revival`
          : `Moved ${moved} product(s); ${failed.length} failed`,
    });
  } catch (error) {
    console.error('[listing-product] move-to-revival:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to move to revival',
      },
      { status: 500 }
    );
  }
}
