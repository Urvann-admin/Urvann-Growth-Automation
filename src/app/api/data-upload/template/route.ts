import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create CSV template with headers only
    // Matching is by alias (unique). _id column is stored as string only (your custom id).
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

