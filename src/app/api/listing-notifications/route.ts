import { NextRequest, NextResponse } from 'next/server';
import { ListingNotificationModel } from '@/models/listingNotification';

export async function GET() {
  try {
    const notifications = await ListingNotificationModel.findUnread();
    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('[listing-notifications] GET error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAll } = body as { id?: string; markAll?: boolean };

    if (markAll) {
      await ListingNotificationModel.markAllAsRead();
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id or markAll is required' },
        { status: 400 }
      );
    }

    await ListingNotificationModel.markAsRead(id);
    return NextResponse.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[listing-notifications] PUT error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to update notification' },
      { status: 500 }
    );
  }
}
