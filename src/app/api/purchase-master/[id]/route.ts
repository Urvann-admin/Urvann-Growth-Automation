import { NextRequest, NextResponse } from 'next/server';
import { PurchaseMasterModel } from '@/models/purchaseMaster';
import { syncParentFromPurchases } from '../syncParent';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }
    const doc = await PurchaseMasterModel.findById(id);
    if (!doc) {
      return NextResponse.json(
        { success: false, message: 'Purchase record not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('[purchase-master] GET id error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }
    const existing = await PurchaseMasterModel.findById(id);
    const oldParentSku = existing ? String(existing.parentSku || '').trim() : '';

    const updateData = { ...body } as Record<string, unknown>;
    delete updateData._id;
    delete updateData.createdAt;

    const quantity = updateData.quantity != null ? Number(updateData.quantity) : undefined;
    const amount = updateData.amount != null ? Number(updateData.amount) : undefined;
    if (quantity != null && amount != null && Number.isFinite(quantity) && Number.isFinite(amount) && quantity > 0) {
      updateData.productPrice = Math.round(amount / quantity);
    }

    const result = await PurchaseMasterModel.update(id, updateData);
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Purchase record not found' },
        { status: 404 }
      );
    }
    const updated = await PurchaseMasterModel.findById(id);
    const newParentSku = updated ? String(updated.parentSku || '').trim() : '';

    if (newParentSku) {
      try {
        await syncParentFromPurchases(newParentSku);
      } catch (err) {
        console.warn('[purchase-master] Failed to sync parent for sku:', newParentSku, err);
      }
    }
    if (oldParentSku && oldParentSku !== newParentSku) {
      try {
        await syncParentFromPurchases(oldParentSku);
      } catch (err) {
        console.warn('[purchase-master] Failed to sync parent for sku:', oldParentSku, err);
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[purchase-master] PUT id error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }
    const existing = await PurchaseMasterModel.findById(id);
    const parentSku = existing ? String(existing.parentSku || '').trim() : '';

    const result = await PurchaseMasterModel.delete(id);
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Purchase record not found' },
        { status: 404 }
      );
    }
    if (parentSku) {
      try {
        await syncParentFromPurchases(parentSku);
      } catch (err) {
        console.warn('[purchase-master] Failed to sync parent for sku after delete:', parentSku, err);
      }
    }
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('[purchase-master] DELETE id error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to delete' },
      { status: 500 }
    );
  }
}
