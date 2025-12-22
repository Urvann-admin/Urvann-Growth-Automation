import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/frequently-bought/substores
 * 
 * Retrieves all unique substores from the frequentlyBought collection
 */
export async function GET() {
  try {
    const collection = await getCollection('frequentlyBought');

    // Get unique substores (excluding admin channel documents and excluded substores)
    // IMPORTANT: Exclude substores "hubchange" and "test4"
    const substores = await collection.distinct('substore', { 
      channel: { $ne: 'admin' },
      substore: { $nin: ['hubchange', 'test4'] }, // Exclude hubchange and test4 substores
    });

    // Sort alphabetically
    substores.sort((a: string, b: string) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      data: substores,
      total: substores.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching substores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch substores', error: errorMessage },
      { status: 500 }
    );
  }
}

