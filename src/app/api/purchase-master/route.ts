import { NextRequest, NextResponse } from 'next/server';
import {
  PurchaseMasterModel,
  type PurchaseMaster,
  type PurchaseOverhead,
  type PurchaseTypeBreakdown,
} from '@/models/purchaseMaster';
import { ParentMasterModel, isBaseParent } from '@/models/parentMaster';
import { ProcurementSellerMasterModel } from '@/models/procurementSellerMaster';
import {
  recalculateListingChildrenInventory,
  sendInventoryWebhook,
} from './recalculateChildren';

/** Add type breakdown amounts (existing + incoming); used to accumulate on parent when same SKU appears in multiple bills. Stores exact integer quantities. */
function addTypeBreakdown(
  existing: PurchaseTypeBreakdown | undefined,
  incoming: PurchaseTypeBreakdown | undefined
): PurchaseTypeBreakdown {
  return {
    listing: Math.floor((Number(existing?.listing ?? 0) || 0) + (Number(incoming?.listing ?? 0) || 0)),
    revival: Math.floor((Number(existing?.revival ?? 0) || 0) + (Number(incoming?.revival ?? 0) || 0)),
    growth: Math.floor((Number(existing?.growth ?? 0) || 0) + (Number(incoming?.growth ?? 0) || 0)),
    consumers: Math.floor((Number(existing?.consumers ?? 0) || 0) + (Number(incoming?.consumers ?? 0) || 0)),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const billNumber = searchParams.get('billNumber')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const query: Record<string, unknown> = {};
    if (billNumber) {
      query.billNumber = billNumber;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { billNumber: regex },
        { productCode: regex },
        { productName: regex },
        { parentSku: regex },
        { seller: regex },
      ];
    }

    const result = await PurchaseMasterModel.findWithPagination(
      query,
      page,
      limit,
      sortField,
      sortOrder as 1 | -1
    );

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('[purchase-master] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to fetch purchases',
      },
      { status: 500 }
    );
  }
}

/** Validate that all parent SKUs exist in parent master; returns error message if any missing */
async function validateParentSkusExist(
  items: { parentSku: string }[]
): Promise<{ success: true } | { success: false; message: string }> {
  const uniqueSkus = [...new Set(items.map((i) => String(i.parentSku || '').trim()).filter(Boolean))];
  const missing: string[] = [];
  const notBase: string[] = [];
  for (const sku of uniqueSkus) {
    const parent = await ParentMasterModel.findBySku(sku);
    if (!parent) missing.push(sku);
    else if (!isBaseParent(parent)) notBase.push(sku);
  }
  if (missing.length > 0) {
    return {
      success: false,
      message: `The following parent SKUs are not in our system. Please add them in product master first: ${missing.join(', ')}`,
    };
  }
  if (notBase.length > 0) {
    return {
      success: false,
      message: `Purchase rows must use a base (parent) plant SKU. These are not base parents: ${notBase.join(', ')}`,
    };
  }
  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      const validated: Omit<PurchaseMaster, '_id' | 'createdAt' | 'updatedAt'>[] = [];
      for (let i = 0; i < body.length; i++) {
        const v = validatePurchaseItem(body[i]);
        if (!v.success) {
          return NextResponse.json(
            { success: false, message: `Row ${i + 1}: ${v.message}` },
            { status: 400 }
          );
        }
        validated.push(v.data!);
      }
      const parentCheck = await validateParentSkusExist(validated);
      if (!parentCheck.success) {
        return NextResponse.json(
          { success: false, message: parentCheck.message },
          { status: 400 }
        );
      }
      for (const item of validated) {
        const raw = item.seller?.trim();
        if (raw) {
          const resolved = await ProcurementSellerMasterModel.resolveToStoredSellerRef(raw);
          if (!resolved) {
            return NextResponse.json(
              {
                success: false,
                message: `Unknown seller: "${raw}". Use procurement seller _id, vendor code, or seller name as in Procurement seller master.`,
              },
              { status: 400 }
            );
          }
          item.seller = resolved;
        }
      }
      const result = await PurchaseMasterModel.createMany(validated);
      // Update parent master typeBreakdown and inventory_quantity (when type is Listing)
      const skuToType = new Map<string, PurchaseTypeBreakdown>();
      const skuToListingQuantity = new Map<string, number>();
      for (const row of validated) {
        const sku = String(row.parentSku || '').trim();
        if (sku && (row.type?.listing != null || row.type?.revival != null || row.type?.growth != null || row.type?.consumers != null)) {
          const current = skuToType.get(sku);
          skuToType.set(sku, addTypeBreakdown(current, row.type));
          // Sum quantity for rows with Listing type to add to parent inventory_quantity
          if (row.type?.listing != null && row.type.listing > 0) {
            const q = Number(row.quantity) || 0;
            skuToListingQuantity.set(sku, (skuToListingQuantity.get(sku) ?? 0) + q);
          }
        }
      }
      for (const [sku, incomingType] of skuToType) {
        try {
          const parent = await ParentMasterModel.findBySku(sku);
          if (parent?._id && isBaseParent(parent)) {
            const newTypeBreakdown = addTypeBreakdown(parent.typeBreakdown, incomingType);
            const listingQtyDelta = skuToListingQuantity.get(sku) ?? 0;
            const newInventory =
              listingQtyDelta > 0
                ? (parent.inventory_quantity ?? 0) + listingQtyDelta
                : undefined;
            await ParentMasterModel.update(parent._id, {
              typeBreakdown: newTypeBreakdown,
              ...(newInventory !== undefined && { inventory_quantity: newInventory }),
            });
          }
        } catch (err) {
          console.warn('[purchase-master] Failed to update parent typeBreakdown for sku:', sku, err);
        }
      }

      // Recalculate listing children inventory and send webhook for updated parents
      const updatedParentSkus = Array.from(skuToType.keys());
      if (updatedParentSkus.length > 0) {
        recalculateListingChildrenInventory(updatedParentSkus).catch((err) =>
          console.error('[purchase-master] Child inventory recalculation failed:', err)
        );
        for (const [sku, ] of skuToListingQuantity) {
          const delta = skuToListingQuantity.get(sku) ?? 0;
          if (delta > 0) {
            sendInventoryWebhook(sku, delta).catch((err) =>
              console.error('[purchase-master] Webhook failed for', sku, err)
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Created ${result.insertedCount} purchase record(s)`,
        insertedCount: result.insertedCount,
      });
    }

    const validated = validatePurchaseItem(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.message },
        { status: 400 }
      );
    }
    const parentCheck = await validateParentSkusExist([validated.data!]);
    if (!parentCheck.success) {
      return NextResponse.json(
        { success: false, message: parentCheck.message },
        { status: 400 }
      );
    }
    const single = validated.data!;
    const rawSeller = single.seller?.trim();
    if (rawSeller) {
      const resolved = await ProcurementSellerMasterModel.resolveToStoredSellerRef(rawSeller);
      if (!resolved) {
        return NextResponse.json(
          {
            success: false,
            message: `Unknown seller: "${rawSeller}". Use procurement seller _id, vendor code, or seller name as in Procurement seller master.`,
          },
          { status: 400 }
        );
      }
      single.seller = resolved;
    }
    const created = await PurchaseMasterModel.create(single);
    const data = validated.data!;
    const sku = String(data.parentSku || '').trim();
    if (sku && (data.type?.listing != null || data.type?.revival != null || data.type?.growth != null || data.type?.consumers != null)) {
      try {
        const parent = await ParentMasterModel.findBySku(sku);
        if (parent?._id && isBaseParent(parent)) {
          const newTypeBreakdown = addTypeBreakdown(parent.typeBreakdown, data.type);
          const listingQty = data.type?.listing != null && data.type.listing > 0 ? (Number(data.quantity) || 0) : 0;
          const newInventory =
            listingQty > 0 ? (parent.inventory_quantity ?? 0) + listingQty : undefined;
          await ParentMasterModel.update(parent._id, {
            typeBreakdown: newTypeBreakdown,
            ...(newInventory !== undefined && { inventory_quantity: newInventory }),
          });
        }
      } catch (err) {
        console.warn('[purchase-master] Failed to update parent typeBreakdown for sku:', sku, err);
      }

      // Recalculate listing children inventory and send webhook
      if (sku) {
        recalculateListingChildrenInventory([sku]).catch((err) =>
          console.error('[purchase-master] Child inventory recalculation failed:', err)
        );
        const listingDelta = data.type?.listing != null && data.type.listing > 0 ? (Number(data.quantity) || 0) : 0;
        if (listingDelta > 0) {
          sendInventoryWebhook(sku, listingDelta).catch((err) =>
            console.error('[purchase-master] Webhook failed for', sku, err)
          );
        }
      }
    }
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('[purchase-master] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create purchase',
      },
      { status: 500 }
    );
  }
}

function validatePurchaseItem(data: unknown): {
  success: boolean;
  message?: string;
  data?: Omit<PurchaseMaster, '_id' | 'createdAt' | 'updatedAt'>;
} {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Invalid data format' };
  }
  const d = data as Record<string, unknown>;

  if (!d.billNumber || typeof d.billNumber !== 'string' || !String(d.billNumber).trim()) {
    return { success: false, message: 'billNumber is required' };
  }
  if (!d.productCode || typeof d.productCode !== 'string' || !String(d.productCode).trim()) {
    return { success: false, message: 'productCode is required' };
  }
  const productName =
    d.productName != null && typeof d.productName === 'string'
      ? String(d.productName).trim()
      : undefined;
  const itemType =
    d.itemType != null && typeof d.itemType === 'string'
      ? String(d.itemType).trim()
      : undefined;
  const quantity = Number(d.quantity);
  if (d.quantity == null || !Number.isInteger(quantity) || quantity < 0) {
    return { success: false, message: 'quantity must be a non-negative integer' };
  }
  const amount = Number(d.amount);
  if (d.amount == null || !Number.isInteger(amount) || amount < 0) {
    return { success: false, message: 'amount must be a non-negative integer' };
  }
  if (!d.parentSku || typeof d.parentSku !== 'string') {
    return { success: false, message: 'parentSku is required' };
  }

  const seller =
    d.seller != null && typeof d.seller === 'string' && String(d.seller).trim()
      ? String(d.seller).trim()
      : undefined;

  const q = Math.floor(quantity);
  const amt = Math.floor(amount);
  const productPrice = q > 0 ? Math.round(amt / q) : 0;

  const type = normalizeType(d.type);
  const overhead = d.overhead != null ? normalizeOverhead(d.overhead) : undefined;

  return {
    success: true,
    data: {
      billNumber: String(d.billNumber).trim(),
      productCode: String(d.productCode).trim(),
      ...(productName !== undefined && productName !== '' && { productName }),
      ...(itemType !== undefined && itemType !== '' && { itemType }),
      quantity: q,
      productPrice,
      amount: amt,
      type,
      parentSku: String(d.parentSku).trim(),
      ...(seller && { seller }),
      ...(overhead && { overhead }),
    },
  };
}

function normalizeType(t: unknown): PurchaseTypeBreakdown {
  if (!t || typeof t !== 'object') return {};
  const o = t as Record<string, unknown>;
  return {
    listing: o.listing != null && o.listing !== '' ? Number(o.listing) : undefined,
    revival: o.revival != null && o.revival !== '' ? Number(o.revival) : undefined,
    growth: o.growth != null && o.growth !== '' ? Number(o.growth) : undefined,
    consumers: o.consumers != null && o.consumers !== '' ? Number(o.consumers) : undefined,
  };
}

function normalizeOverhead(o: unknown): PurchaseOverhead | undefined {
  if (!o || typeof o !== 'object') return undefined;
  const obj = o as Record<string, unknown>;
  const allocationMethod = obj.allocationMethod as PurchaseOverhead['allocationMethod'];
  const validMethods = ['Equal', 'Manual', 'quantity', 'value'];
  return {
    overheadAmount: obj.overheadAmount != null && obj.overheadAmount !== '' ? Number(obj.overheadAmount) : undefined,
    overheadNature: obj.overheadNature ? String(obj.overheadNature).trim() : undefined,
    bill: obj.bill ? String(obj.bill).trim() : undefined,
    allocatedAmount: obj.allocatedAmount != null && obj.allocatedAmount !== '' ? Number(obj.allocatedAmount) : undefined,
    allocationMethod: allocationMethod && validMethods.includes(allocationMethod) ? allocationMethod : undefined,
  };
}
