import { NextRequest, NextResponse } from 'next/server';
import {
  moveListingProductsToRevival,
  type MoveToRevivalEntry,
} from '@/app/api/listing-product/moveToRevivalCore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawMoves = body?.moves;
    let entries: MoveToRevivalEntry[] | string[] = [];

    if (Array.isArray(rawMoves) && rawMoves.length > 0) {
      entries = rawMoves
        .map((m: unknown) => {
          if (m && typeof m === 'object' && 'id' in m) {
            const id = String((m as { id: unknown }).id ?? '').trim();
            const q = (m as { quantity?: unknown }).quantity;
            const quantity =
              q !== undefined && q !== null && String(q).trim() !== ''
                ? Math.floor(Number(q))
                : undefined;
            return { id, ...(quantity != null && Number.isFinite(quantity) ? { quantity } : {}) };
          }
          return null;
        })
        .filter((x): x is MoveToRevivalEntry => x != null && Boolean(x.id));
    } else {
      const rawIds = body?.listingProductIds ?? body?.ids;
      entries = Array.isArray(rawIds)
        ? rawIds.map((x: unknown) => String(x).trim()).filter(Boolean)
        : [];
    }

    if (entries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Provide a non-empty `moves` array [{ id, quantity? }] or listingProductIds / ids',
        },
        { status: 400 }
      );
    }

    const { moved, failed } = await moveListingProductsToRevival(entries);

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
