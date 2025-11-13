import { NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';

export async function GET() {
  try {
    // Get all categories (including unpublished) sorted by priorityOrder
    const allCategories = await CategoryModel.findAll();
    const categories = allCategories.sort((a: any, b: any) => (a.priorityOrder || 0) - (b.priorityOrder || 0));
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}










