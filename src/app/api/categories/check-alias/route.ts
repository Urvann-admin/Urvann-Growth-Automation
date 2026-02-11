import { NextRequest, NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';

/**
 * GET /api/categories/check-alias?alias=xxx
 * Returns { success: true, exists: boolean }.
 * Used to validate alias uniqueness before proceeding from Basics step.
 */
export async function GET(request: NextRequest) {
  try {
    const alias = request.nextUrl.searchParams.get('alias');
    if (alias == null || String(alias).trim() === '') {
      return NextResponse.json(
        { success: false, message: 'alias query is required' },
        { status: 400 }
      );
    }
    const existing = await CategoryModel.findByAlias(String(alias).trim());
    return NextResponse.json({
      success: true,
      exists: !!existing,
    });
  } catch (error) {
    console.error('Error checking alias:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check alias' },
      { status: 500 }
    );
  }
}
