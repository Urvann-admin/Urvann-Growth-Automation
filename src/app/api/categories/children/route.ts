import { NextResponse } from 'next/server';
import { CategoryModel } from '@/models/category';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentAlias = searchParams.get('parentAlias');
    const parentType = searchParams.get('parentType');

    if (!parentAlias || !parentType) {
      return NextResponse.json(
        { success: false, message: 'Parent alias and type are required' },
        { status: 400 }
      );
    }

    let categories;
    switch (parentType) {
      case 'L1':
        // Get L2 categories where L1Parent matches
        categories = await CategoryModel.findByParent(parentAlias);
        break;
      case 'L2':
        // Get L3 categories where L2Parent matches
        categories = await CategoryModel.findByParent(undefined, parentAlias);
        break;
      case 'L3':
        // Get L3 categories where L3Parent matches
        categories = await CategoryModel.findByParent(undefined, undefined, parentAlias);
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid parent type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching child categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch child categories' },
      { status: 500 }
    );
  }
}




