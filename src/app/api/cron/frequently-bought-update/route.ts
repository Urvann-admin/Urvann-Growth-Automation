/**
 * Cron job API route for automatically running frequently bought together updates
 * Runs every Friday at 10 AM
 * 
 * Can be triggered by:
 * - Linux cron (crontab) on EC2
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Manual trigger via GET request
 * - node-cron (initialized automatically on server start)
 */

import { NextResponse } from 'next/server';
import { runCompleteProcess } from '@/services/frequentlyBoughtOrchestrator';
import { initializeCronJobs } from '@/lib/cronService';

// Initialize cron jobs on first API call (for EC2/node-cron setup)
// Use lazy initialization to avoid client-side bundling issues
let cronInitialized = false;
let cronInitPromise: Promise<void> | null = null;

async function ensureCronInitialized() {
  if (cronInitialized || typeof window !== 'undefined') {
    return;
  }
  if (!cronInitPromise) {
    cronInitPromise = initializeCronJobs().then(() => {
      cronInitialized = true;
    });
  }
  return cronInitPromise;
}

/**
 * GET /api/cron/frequently-bought-update
 * 
 * This endpoint can be called by:
 * 1. Linux cron (crontab) on EC2
 * 2. External cron services
 * 3. Manual trigger for testing
 * 4. node-cron (automatically scheduled on server start)
 * 
 * Security: Add authentication if needed
 */
export async function GET(request: Request) {
  try {
    // Initialize cron jobs on first call (lazy initialization)
    await ensureCronInitialized();
    
    // Optional: Add authentication/authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Check if it's Friday 10 AM (optional validation)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    const hour = now.getHours();
    
    // Allow manual triggers or if it's Friday 10 AM
    const isFriday10AM = dayOfWeek === 5 && hour === 10;
    const isManualTrigger = request.headers.get('x-manual-trigger') === 'true';
    
    if (!isFriday10AM && !isManualTrigger && process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        message: 'Cron job only runs on Friday at 10 AM',
        currentTime: now.toISOString(),
        dayOfWeek,
        hour,
      });
    }

    console.log(`[Cron] Starting frequently bought together update process at ${now.toISOString()}`);

    // Run the complete process
    const result = await runCompleteProcess({
      emailTo: 'harsh@urvann.com',
      onProgress: (stage, message) => {
        console.log(`[Cron] [${stage.toUpperCase()}] ${message}`);
      },
    });

    if (result.success) {
      console.log(`[Cron] ✅ Process completed successfully in ${result.totalTime}s`);
      return NextResponse.json({
        success: true,
        message: 'Process completed successfully',
        stats: {
          sync: result.syncResult
            ? {
                totalSynced: result.syncResult.totalSynced,
                elapsedTime: result.syncResult.elapsedTime,
              }
            : null,
          push: result.pushResult
            ? {
                totalSkus: result.pushResult.totalSkus,
                successful: result.pushResult.successful,
                failed: result.pushResult.failed,
                elapsedTime: result.pushResult.elapsedTime,
              }
            : null,
          emailSent: result.emailSent,
          totalTime: result.totalTime,
        },
      });
    } else {
      console.error(`[Cron] ❌ Process failed:`, result.errors);
      return NextResponse.json(
        {
          success: false,
          message: 'Process completed with errors',
          errors: result.errors,
          stats: {
            sync: result.syncResult,
            push: result.pushResult,
            emailSent: result.emailSent,
            totalTime: result.totalTime,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/frequently-bought-update
 * Alternative endpoint for POST requests (some cron services prefer POST)
 */
export async function POST(request: Request) {
  return GET(request);
}
