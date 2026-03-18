import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ParentMasterModel } from '@/models/parentMaster';

/** Normalized factor = grandTotalAmount / billTotalAmount. Inflates row cost by overhead share. */
export interface GrowthProduct {
  parentSku: string;
  productCode: string;
  productName?: string;
  finalName?: string;
  plant?: string;
  quantity: number;
  /** Unit price (amount/quantity) before normalized factor */
  price: number;
  /** Total amount = price × quantity × normalizedFactor (includes overhead allocation) */
  amount: number;
    /** Normalized factor used for this product's amount (per-bill average when multiple bills) */
  normalizedFactor: number;
  /** Earliest invoice date (when first purchased) */
  invoiceDate?: string;
}

interface PurchaseRow {
  _id: unknown;
  billNumber: string;
  productCode: string;
  productName?: string;
  parentSku: string;
  quantity: number;
  amount: number;
  type?: { listing?: number; revival?: number; growth?: number; consumers?: number };
  overhead?: { allocatedAmount?: number };
  createdAt?: Date | string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search')?.trim() || '';
    const sortField = searchParams.get('sortField') || 'quantity';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const collection = await getCollection('purchaseMaster');

    const matchStage: Record<string, unknown> = { 'type.growth': { $gt: 0 } };
    if (search) {
      const regex = new RegExp(search, 'i');
      matchStage.$or = [
        { productName: regex },
        { productCode: regex },
        { parentSku: regex },
      ];
    }

    const rows = (await collection.find(matchStage).toArray()) as PurchaseRow[];

    // Group by bill to compute normalized factor per bill
    const byBill = new Map<string, PurchaseRow[]>();
    for (const r of rows) {
      const bill = (r.billNumber ?? '').trim() || '—';
      if (!byBill.has(bill)) byBill.set(bill, []);
      byBill.get(bill)!.push(r);
    }

    const billToFactor = new Map<string, number>();
    for (const [billNumber, billRows] of byBill) {
      const billTotalAmount = billRows.reduce((s, r) => s + (r.amount ?? 0), 0);
      const totalOverhead = billRows.reduce((s, r) => s + (r.overhead?.allocatedAmount ?? 0), 0);
      const grandTotalAmount = billTotalAmount + totalOverhead;
      const factor = billTotalAmount > 0 ? grandTotalAmount / billTotalAmount : 1;
      billToFactor.set(billNumber, factor);
    }

    const byParent = new Map<string, { quantity: number; amount: number; priceSum: number; priceCount: number; factorSum: number; earliestDate?: Date }>();
    for (const r of rows) {
      const t = r.type;
      const growthVal = Number(t?.growth ?? 0) || 0;
      const growthQty = growthVal > 1 ? growthVal : (growthVal > 0 ? (Number(r.quantity) || 0) : 0);
      if (growthQty <= 0) continue;

      const qty = Math.max(Number(r.quantity) || 0, 1);
      const amt = Number(r.amount) || 0;
      const unitPrice = amt / qty;
      const bill = (r.billNumber ?? '').trim() || '—';
      const factor = billToFactor.get(bill) ?? 1;

      const growthAmount = unitPrice * growthQty * factor;
      const sku = String(r.parentSku ?? '').trim();
      if (!sku) continue;

      const rowDate = r.createdAt ? new Date(r.createdAt) : undefined;
      const existing = byParent.get(sku);
      if (existing) {
        existing.quantity += growthQty;
        existing.amount += growthAmount;
        existing.priceSum += unitPrice * growthQty;
        existing.priceCount += growthQty;
        existing.factorSum += factor * growthQty;
        if (rowDate && (!existing.earliestDate || rowDate < existing.earliestDate)) {
          existing.earliestDate = rowDate;
        }
      } else {
        byParent.set(sku, {
          quantity: growthQty,
          amount: growthAmount,
          priceSum: unitPrice * growthQty,
          priceCount: growthQty,
          factorSum: factor * growthQty,
          earliestDate: rowDate,
        });
      }
    }

    const aggregated = Array.from(byParent.entries()).map(([parentSku, agg]) => {
      const firstRow = rows.find((r) => String(r.parentSku ?? '').trim() === parentSku);
      const avgFactor = agg.quantity > 0 ? agg.factorSum / agg.quantity : 1;
      return {
        _id: parentSku,
        productCode: firstRow?.productCode ?? '',
        productName: firstRow?.productName,
        quantity: agg.quantity,
        amount: agg.amount,
        price: agg.quantity > 0 ? agg.priceSum / agg.quantity : 0,
        normalizedFactor: avgFactor,
        invoiceDate: agg.earliestDate?.toISOString(),
      };
    });

    const totalProducts = aggregated.length;
    const totalQuantity = aggregated.reduce((s, a) => s + a.quantity, 0);
    const totalAmount = aggregated.reduce((s, a) => s + a.amount, 0);

    aggregated.sort((a, b) => {
      const valA = a[sortField as keyof typeof a] ?? 0;
      const valB = b[sortField as keyof typeof b] ?? 0;
      return sortOrder * (valA < valB ? -1 : valA > valB ? 1 : 0);
    });

    const paginated = aggregated.slice((page - 1) * limit, page * limit);

    // Enrich with parent master (finalName, plant)
    const enriched: GrowthProduct[] = await Promise.all(
      paginated.map(async (row) => {
        const parent = await ParentMasterModel.findBySku(row._id);
        return {
          parentSku: row._id,
          productCode: row.productCode,
          productName: row.productName,
          finalName: parent?.finalName,
          plant: parent?.plant,
          quantity: row.quantity,
          price: Math.round(row.price * 100) / 100,
          amount: Math.round(row.amount),
          normalizedFactor: Math.round(row.normalizedFactor * 1000) / 1000,
          invoiceDate: row.invoiceDate,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enriched,
      totals: {
        quantity: totalQuantity,
        amount: Math.round(totalAmount),
        products: totalProducts,
      },
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages: Math.ceil(totalProducts / limit),
      },
    });
  } catch (error) {
    console.error('[growth-products] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to fetch growth products',
      },
      { status: 500 }
    );
  }
}
