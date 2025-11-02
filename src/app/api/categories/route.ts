import { NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';

export async function GET() {
  try {
    const categories = await CategoryModel.findPublished();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}










