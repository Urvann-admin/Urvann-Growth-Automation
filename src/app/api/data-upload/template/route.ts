import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create CSV template with headers only
    // Note: _id is a string field. For new categories, provide your custom _id value (string).
    // For updates, include _id and only the fields you want to update.
    const headers = [
      '_id',
      'category',
      'alias',
      'typeOfCategory',
      'l1Parent',
      'l2Parent',
      'l3Parent',
      'publish',
      'priorityOrder',
      'substores'
    ];

    // Build CSV content with headers only
    const csvContent = headers.join(',');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="category-upload-template.csv"',
      },
    });
  } catch (error: any) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate template', error: error.message },
      { status: 500 }
    );
  }
}

