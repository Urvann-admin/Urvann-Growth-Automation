import { NextResponse } from 'next/server';
import { ProductInventoryAuditLogModel } from '@/models/productInventoryAuditLog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU parameter is required' },
        { status: 400 }
      );
    }

    // Get audit logs for the specific SKU
    const [auditLogs, totalCount] = await Promise.all([
      ProductInventoryAuditLogModel.findBySku(sku, limit),
      ProductInventoryAuditLogModel.countBySku(sku),
    ]);

    return NextResponse.json({
      success: true,
      data: auditLogs,
      meta: {
        sku,
        totalLogs: totalCount,
        showing: auditLogs.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit logs', error: error.message },
      { status: 500 }
    );
  }
}
