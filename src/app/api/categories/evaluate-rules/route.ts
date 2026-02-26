import { NextRequest, NextResponse } from 'next/server';
import { getAutoCategoriesForProduct } from '@/lib/categoryRules';
import type { ProductForRuleEvaluation } from '@/lib/categoryRules';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the product data
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid product data' },
        { status: 400 }
      );
    }

    const productData: ProductForRuleEvaluation = {
      plant: String(body.plant || '').trim(),
      variety: body.variety ? String(body.variety).trim() : undefined,
      colour: body.colour ? String(body.colour).trim() : undefined,
      height: typeof body.height === 'number' ? body.height : undefined,
      size: typeof body.size === 'number' ? body.size : undefined,
      type: body.type ? String(body.type).trim() : undefined,
      categories: Array.isArray(body.categories) ? body.categories.map((c: unknown) => String(c)) : undefined,
    };

    // Validate required fields
    if (!productData.plant) {
      return NextResponse.json(
        { success: false, message: 'Plant name is required' },
        { status: 400 }
      );
    }

    // Get auto categories based on rules
    const autoCategories = await getAutoCategoriesForProduct(productData);

    return NextResponse.json({
      success: true,
      categories: autoCategories,
      productData, // Echo back the processed data for debugging
    });
  } catch (error) {
    console.error('Error evaluating category rules:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to evaluate category rules' },
      { status: 500 }
    );
  }
}