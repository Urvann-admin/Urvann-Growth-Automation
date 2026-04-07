import { NextRequest, NextResponse } from 'next/server';
import { ListingNotificationModel } from '@/models/listingNotification';
import { ListingProductModel, type ListingProduct } from '@/models/listingProduct';
import { syncListingProductToSkuMasterNew } from '@/models/skuMasterNew';

async function notifyInventoryManagementPublish(skus: string[]): Promise<void> {
  const baseUrl = process.env.INVENTORY_MANAGEMENT_API_URL;
  if (!baseUrl || skus.length === 0) return;
  try {
    await fetch(`${baseUrl}/api/inventoryOrders/webhook/publish-skus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus }),
    });
  } catch (err) {
    console.error('[listing-notifications/publish] IMS webhook failed:', err);
  }
}

/**
 * User-approved publish for listing products that had inventory recalculated
 * while staying unpublished (invoice flow).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const notificationId = typeof body.notificationId === 'string' ? body.notificationId.trim() : '';

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: 'notificationId is required' },
        { status: 400 }
      );
    }

    const notif = await ListingNotificationModel.findById(notificationId);
    if (!notif) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notif.read) {
      return NextResponse.json(
        { success: false, message: 'This notification was already handled' },
        { status: 400 }
      );
    }

    const ids = Array.isArray(notif.listingProductIds) ? notif.listingProductIds : [];
    const skusFromNotif = Array.isArray(notif.childSkus) ? notif.childSkus : [];

    const products: ListingProduct[] = [];

    if (ids.length > 0) {
      for (const id of ids) {
        const p = await ListingProductModel.findById(id);
        if (p) products.push(p as ListingProduct);
      }
    } else {
      for (const sku of skusFromNotif) {
        const p = await ListingProductModel.findBySku(sku);
        if (p) products.push(p as ListingProduct);
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No matching listing products found for this notification.',
        },
        { status: 404 }
      );
    }

    const publishedSkus: string[] = [];
    const skipped: string[] = [];

    for (const p of products) {
      if (!p?._id) continue;
      const inv = p.inventory_quantity ?? 0;
      if (inv <= 0) {
        skipped.push(`${p.sku ?? p._id}: no inventory`);
        continue;
      }
      if (p.publish_status === 1) {
        skipped.push(`${p.sku ?? p._id}: already published`);
        continue;
      }

      const statusUpdate: Record<string, unknown> = { publish_status: 1 };
      if (p.status === 'listed') {
        statusUpdate.status = 'published';
      }
      await ListingProductModel.update(p._id, statusUpdate as { publish_status: 0 | 1; status?: 'published' });
      const updated = await ListingProductModel.findById(p._id);
      if (updated) {
        await syncListingProductToSkuMasterNew(updated as ListingProduct);
      }
      const sku = updated?.sku?.trim();
      if (sku) publishedSkus.push(sku);
    }

    const allAlreadyPublished =
      products.length > 0 &&
      publishedSkus.length === 0 &&
      skipped.length > 0 &&
      skipped.every((s) => String(s).includes('already published'));

    if (publishedSkus.length === 0 && !allAlreadyPublished) {
      return NextResponse.json(
        {
          success: false,
          message: 'No products were published. Fix inventory or publish status and try again.',
          publishedSkus,
          skipped,
        },
        { status: 422 }
      );
    }

    await notifyInventoryManagementPublish(publishedSkus);
    await ListingNotificationModel.markAsRead(notificationId);

    return NextResponse.json({
      success: true,
      publishedCount: publishedSkus.length,
      publishedSkus,
      skipped,
      clearedWithoutPublish: allAlreadyPublished,
    });
  } catch (error) {
    console.error('[listing-notifications/publish] error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to publish',
      },
      { status: 500 }
    );
  }
}
