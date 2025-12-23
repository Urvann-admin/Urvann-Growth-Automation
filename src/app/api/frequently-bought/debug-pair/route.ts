import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/frequently-bought/debug-pair
 * 
 * Debug endpoint to find all transactions where two SKUs appear together
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sku1 = searchParams.get('sku1') || '';
    const sku2 = searchParams.get('sku2') || '';

    if (!sku1 || !sku2) {
      return NextResponse.json({
        success: false,
        message: 'Both sku1 and sku2 are required',
      }, { status: 400 });
    }

    const collection = await getCollection('frequentlyBought');

    // Find all transactions containing both SKUs
    const results = await collection.find({
      channel: { $ne: 'admin' },
      'items.sku': { $all: [sku1, sku2] },
    }, {
      projection: {
        txn_id: 1,
        order_id: 1,
        substore: 1,
        order_created_at: 1,
        items: 1,
      }
    }).toArray();

    // Filter out transactions where either SKU has price == 1 (explicit check to ensure price: 1 items are never included)
    const validResults = results.filter(doc => {
      const item1 = doc.items.find((i: { sku: string; price?: number }) => i.sku === sku1);
      const item2 = doc.items.find((i: { sku: string; price?: number }) => i.sku === sku2);
      // Explicitly exclude price: 1 and handle undefined/null
      return (item1?.price != null && item1.price !== 1) && (item2?.price != null && item2.price !== 1);
    });

    // Simple format: numbered list with txn_id and order_id
    const list = validResults.map((doc, idx) => 
      `${idx + 1}) txn_id: ${doc.txn_id}, order_id: ${doc.order_id}`
    );

    return NextResponse.json({
      success: true,
      sku1,
      sku2,
      total: validResults.length,
      list: list.join('\n'),
    });
  } catch (error: unknown) {
    console.error('Error debugging pair:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to debug pair', error: errorMessage },
      { status: 500 }
    );
  }
}

