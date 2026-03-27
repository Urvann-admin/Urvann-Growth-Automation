import { NextRequest, NextResponse } from 'next/server';
import {
  ProcurementSellerMasterModel,
  type ProcurementSellerMaster,
} from '@/models/procurementSellerMaster';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search')?.trim() || '';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { seller_name: regex },
        { place: regex },
        { vendorCode: regex },
        { phoneNumber: regex },
      ];
    }

    const result = await ProcurementSellerMasterModel.findWithPagination(
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
    console.error('[procurement-seller-master] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to fetch sellers',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateSellerData(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.message },
        { status: 400 }
      );
    }

    const count = await ProcurementSellerMasterModel.count({});
    const vendorCode = generateVendorCode(validated.data!.seller_name, count + 1);
    const created = await ProcurementSellerMasterModel.create({
      ...validated.data!,
      vendorCode,
    });
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('[procurement-seller-master] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create seller',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id, ...updateData } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, message: '_id is required for update' },
        { status: 400 }
      );
    }

    const sanitized = sanitizeUpdateData(updateData);
    const result = await ProcurementSellerMasterModel.update(_id, sanitized);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Seller updated successfully',
    });
  } catch (error) {
    console.error('[procurement-seller-master] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to update seller',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id is required for deletion' },
        { status: 400 }
      );
    }

    const result = await ProcurementSellerMasterModel.delete(id);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Seller deleted successfully',
    });
  } catch (error) {
    console.error('[procurement-seller-master] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to delete seller',
      },
      { status: 500 }
    );
  }
}

const PRODUCT_TYPE_OPTIONS = ['Product', 'saplings', 'consumables'];

function generateVendorCode(sellerName: string, nextIndex: number): string {
  const slug = String(sellerName)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '') || 'Vendor';
  const num = String(nextIndex).padStart(4, '0');
  return `${slug}${num}`;
}

function validateSellerData(data: unknown): {
  success: boolean;
  message?: string;
  data?: Omit<
    ProcurementSellerMaster,
    '_id' | 'createdAt' | 'updatedAt' | 'vendorCode'
  >;
} {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Invalid data format' };
  }

  const d = data as Record<string, unknown>;

  if (
    !d.seller_name ||
    typeof d.seller_name !== 'string' ||
    !String(d.seller_name).trim()
  ) {
    return {
      success: false,
      message: 'seller_name is required and must be a non-empty string',
    };
  }

  const multiplicationFactor =
    d.multiplicationFactor != null && d.multiplicationFactor !== ''
      ? Number(d.multiplicationFactor)
      : undefined;
  if (
    multiplicationFactor !== undefined &&
    (typeof multiplicationFactor !== 'number' || multiplicationFactor < 0)
  ) {
    return {
      success: false,
      message: 'multiplicationFactor must be a non-negative number',
    };
  }

  let productType: string[] | undefined;
  if (d.productType != null) {
    const arr = Array.isArray(d.productType)
      ? d.productType
      : [d.productType];
    const valid = arr
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((v) => v.trim())
      .filter((v) => PRODUCT_TYPE_OPTIONS.includes(v));
    if (valid.length > 0) productType = valid;
  }

  return {
    success: true,
    data: {
      seller_name: String(d.seller_name).trim(),
      place: d.place ? String(d.place).trim() : undefined,
      multiplicationFactor,
      productType,
      phoneNumber: d.phoneNumber ? String(d.phoneNumber).trim() : undefined,
    },
  };
}

function sanitizeUpdateData(
  data: Record<string, unknown>
): Partial<Omit<ProcurementSellerMaster, '_id' | 'createdAt'>> {
  const sanitized: Partial<
    Omit<ProcurementSellerMaster, '_id' | 'createdAt'>
  > = {};

  if (data.seller_name !== undefined) {
    sanitized.seller_name = String(data.seller_name).trim();
  }
  if (data.place !== undefined) {
    sanitized.place = String(data.place).trim() || undefined;
  }
  if (data.multiplicationFactor !== undefined && data.multiplicationFactor !== '') {
    const n = Number(data.multiplicationFactor);
    sanitized.multiplicationFactor = Number.isFinite(n) ? n : undefined;
  }
  if (data.productType !== undefined) {
    const arr = Array.isArray(data.productType)
      ? data.productType
      : [data.productType];
    const valid = arr
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((v) => String(v).trim())
      .filter((v) => PRODUCT_TYPE_OPTIONS.includes(v));
    sanitized.productType = valid.length > 0 ? valid : undefined;
  }
  if (data.phoneNumber !== undefined) {
    sanitized.phoneNumber = String(data.phoneNumber).trim() || undefined;
  }

  return sanitized;
}
