import { NextRequest, NextResponse } from 'next/server';
import { getAllHubCounters } from '@/lib/skuGenerator';
import { SkuCounterModel } from '@/models/skuCounter';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next.js route signature requires request
export async function GET(request: NextRequest) {
  try {
    const counters = await getAllHubCounters();
    
    return NextResponse.json({
      success: true,
      data: counters,
    });
  } catch (error) {
    console.error('Error fetching SKU counters:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch SKU counters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hub, counter } = body;

    if (!hub || typeof hub !== 'string') {
      return NextResponse.json(
        { success: false, message: 'hub is required and must be a string' },
        { status: 400 }
      );
    }

    if (counter === undefined || typeof counter !== 'number' || counter < 0) {
      return NextResponse.json(
        { success: false, message: 'counter is required and must be a non-negative number' },
        { status: 400 }
      );
    }

    await SkuCounterModel.resetCounter(hub, counter);

    return NextResponse.json({
      success: true,
      message: `Counter for hub "${hub}" reset to ${counter}`,
    });
  } catch (error) {
    console.error('Error resetting SKU counter:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset SKU counter' },
      { status: 500 }
    );
  }
}
