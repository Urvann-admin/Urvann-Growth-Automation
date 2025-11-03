/**
 * Worker Initialization Endpoint
 * This endpoint is called once on server startup to initialize the background worker
 */

import { NextResponse } from 'next/server';
import { startBackgroundWorker } from '@/lib/backgroundWorker';

export const dynamic = 'force-dynamic';

let initialized = false;

export async function GET() {
  if (!initialized) {
    console.log('[Init] Starting background worker...');
    await startBackgroundWorker();
    initialized = true;
    return NextResponse.json({ success: true, message: 'Background worker started' });
  }
  
  return NextResponse.json({ success: true, message: 'Background worker already running' });
}

