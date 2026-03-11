import { NextRequest, NextResponse } from 'next/server';
import { PurchaseMasterModel } from '@/models/purchaseMaster';
import { ParentMasterModel } from '@/models/parentMaster';
import { syncParentFromPurchases } from '@/app/api/purchase-master/syncParent';
import type { PurchaseTypeBreakdown } from '@/models/purchaseMaster';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parentSku = body?.parentSku ? String(body.parentSku).trim() : '';
    const quantityToMove = Number(body?.quantityToMove);

    if (!parentSku) {
      return NextResponse.json(
        { success: false, message: 'parentSku is required' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantityToMove) || quantityToMove <= 0) {
      return NextResponse.json(
        { success: false, message: 'quantityToMove must be a positive integer' },
        { status: 400 }
      );
    }

    const parent = await ParentMasterModel.findBySku(parentSku);
    if (!parent?._id) {
      return NextResponse.json(
        { success: false, message: 'Parent product not found' },
        { status: 404 }
      );
    }

    // Fetch purchase rows for this parentSku with type.growth > 0, FIFO (oldest first)
    const purchases = await PurchaseMasterModel.findAll({
      parentSku,
      'type.growth': { $gt: 0 },
    });

    // Compute available growth from purchase rows (same logic as growth-products API: flag mode = row.quantity)
    let availableGrowth = 0;
    for (const row of purchases) {
      const t = row.type;
      const typeSum = (Number(t?.listing ?? 0) || 0) + (Number(t?.revival ?? 0) || 0) + (Number(t?.growth ?? 0) || 0) + (Number(t?.consumers ?? 0) || 0);
      const isFlagMode = typeSum <= 1;
      const growthQty = (t?.growth ?? 0) > 0
        ? (isFlagMode ? Math.max(Number(row.quantity) || 0, 0) : Number(t.growth) || 0)
        : 0;
      availableGrowth += growthQty;
    }

    if (quantityToMove > availableGrowth) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot move ${quantityToMove} units. Only ${availableGrowth} available in growth.`,
        },
        { status: 400 }
      );
    }

    // Sort by createdAt asc for FIFO
    purchases.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    });

    let remaining = quantityToMove;

    for (const row of purchases) {
      if (remaining <= 0) break;

      const t = row.type;
      const typeSum = (Number(t?.listing ?? 0) || 0) + (Number(t?.revival ?? 0) || 0) + (Number(t?.growth ?? 0) || 0) + (Number(t?.consumers ?? 0) || 0);
      const isFlagMode = typeSum <= 1;
      const growthQty = (t?.growth ?? 0) > 0
        ? (isFlagMode ? Math.max(Number(row.quantity) || 0, 0) : Number(t.growth) || 0)
        : 0;
      if (growthQty <= 0) continue;

      const toMove = Math.min(growthQty, remaining);
      const newGrowth = growthQty - toMove;
      const currentListing = Number(t?.listing ?? 0) || 0;
      const newListing = currentListing + toMove;

      const updatedType: PurchaseTypeBreakdown = {
        ...row.type,
        growth: newGrowth > 0 ? newGrowth : undefined,
        listing: newListing,
      };

      if (updatedType.growth === 0) delete updatedType.growth;

      await PurchaseMasterModel.update(row._id!, { type: updatedType });
      remaining -= toMove;
    }

    await syncParentFromPurchases(parentSku);

    const updatedParent = await ParentMasterModel.findBySku(parentSku);

    return NextResponse.json({
      success: true,
      message: `Moved ${quantityToMove} unit(s) to listing`,
      data: updatedParent,
    });
  } catch (error) {
    console.error('[growth-products] move-to-listing error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to move to listing',
      },
      { status: 500 }
    );
  }
}
