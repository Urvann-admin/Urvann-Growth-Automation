import { NextResponse } from 'next/server';
import { SellerMasterModel } from '@/models/sellerMaster';

export async function GET() {
  try {
    const sellers = await SellerMasterModel.findAll();
    return NextResponse.json({ success: true, data: sellers });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sellers' },
      { status: 500 }
    );
  }
}
