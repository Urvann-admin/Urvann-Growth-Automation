import { NextRequest, NextResponse } from 'next/server';
import {
  ProcurementSellerMasterModel,
  type ProcurementSellerMaster,
} from '@/models/procurementSellerMaster';
import { parseOptionalProcurementPhone } from '@/lib/procurementSellerPhone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Seller ID is required' },
        { status: 400 }
      );
    }

    const seller = await ProcurementSellerMasterModel.findById(id);

    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: seller });
  } catch (error) {
    console.error('[procurement-seller-master] GET by id error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to fetch seller',
      },
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
        { success: false, message: 'Seller ID is required' },
        { status: 400 }
      );
    }

    const updateData = { ...body } as Record<string, unknown>;
    delete updateData._id;
    delete updateData.createdAt;

    if (Object.prototype.hasOwnProperty.call(updateData, 'phoneNumber')) {
      const p = parseOptionalProcurementPhone(updateData.phoneNumber);
      if (!p.ok) {
        return NextResponse.json(
          { success: false, message: p.message },
          { status: 400 }
        );
      }
      updateData.phoneNumber = p.value;
    }

    const result = await ProcurementSellerMasterModel.update(
      id,
      updateData as Partial<Omit<ProcurementSellerMaster, '_id' | 'createdAt'>>
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    const updated = await ProcurementSellerMasterModel.findById(id);
    return NextResponse.json({
      success: true,
      message: 'Seller updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('[procurement-seller-master] PUT by id error:', error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Seller ID is required' },
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
    console.error('[procurement-seller-master] DELETE by id error:', error);
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
