/**
 * Cron service for EC2 - runs scheduled tasks
 * This initializes cron jobs when the server starts
 */

// Lazy import to avoid client-side bundling issues
let cron: typeof import('node-cron') | null = null;
let cronJob: any = null;

async function getCron() {
  if (typeof window !== 'undefined') {
    return null; // Don't import on client side
  }
  if (!cron) {
    cron = await import('node-cron');
  }
  return cron;
}

import { runCompleteProcess } from '@/services/frequentlyBoughtOrchestrator';

/**
 * Initialize cron jobs
 * Call this when the server starts
 */
export async function initializeCronJobs() {
  // Only run on server side
  if (typeof window !== 'undefined') {
    return;
  }

  // Lazy load node-cron only on server
  const cronModule = await getCron();
  if (!cronModule) {
    return; // Client side or import failed
  }

  // Check if cron is enabled
  const cronEnabled = process.env.CRON_ENABLED !== 'false'; // Default to enabled
  if (!cronEnabled) {
    console.log('[Cron] Cron jobs are disabled (CRON_ENABLED=false)');
    return;
  }

  // Schedule: Every Friday at 10:00 AM
  // Cron format: minute hour day-of-month month day-of-week
  // 0 10 * * 5 = Friday at 10:00 AM
  const schedule = process.env.CRON_SCHEDULE || '0 10 * * 5';
  const emailTo = process.env.CRON_EMAIL_TO || 'harsh@urvann.com';

  console.log(`[Cron] Initializing cron job with schedule: ${schedule}`);
  console.log(`[Cron] Email notifications will be sent to: ${emailTo}`);

  // Stop existing cron job if any
  if (cronJob) {
    cronJob.stop();
  }

  // Create new cron job
  cronJob = cronModule.schedule(
    schedule,
    async () => {
      const now = new Date();
      console.log(`[Cron] ⏰ Scheduled job triggered at ${now.toISOString()}`);
      console.log(`[Cron] Starting frequently bought together update process...`);
      console.log(`[Cron] Process order: 1) Sync Mappings → 2) Push Updates → 3) Send Email`);

      try {
        const result = await runCompleteProcess({
          emailTo,
          onProgress: (stage, message) => {
            console.log(`[Cron] [${stage.toUpperCase()}] ${message}`);
          },
        });

        if (result.success) {
          console.log(`[Cron] ✅ Process completed successfully in ${result.totalTime}s`);
          console.log(`[Cron] Stats:`, {
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
          });
        } else {
          console.error(`[Cron] ❌ Process completed with errors:`, result.errors);
        }
      } catch (error) {
        console.error(`[Cron] ❌ Fatal error in cron job:`, error);
      }
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Kolkata', // Default to India timezone
    }
  );

  console.log(`[Cron] ✅ Cron job scheduled successfully`);
  console.log(`[Cron] Next run: ${getNextRunTime(schedule)}`);
}

/**
 * Stop cron jobs
 */
export function stopCronJobs() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[Cron] Cron jobs stopped');
  }
}

/**
 * Get next run time for a cron schedule (approximate)
 */
function getNextRunTime(schedule: string): string {
  // This is a simple approximation
  // For accurate next run time, you'd need a cron parser library
  return 'Check cron schedule';
}

/**
 * Manually trigger the cron job (for testing)
 */
export async function triggerCronJobManually(): Promise<void> {
  const emailTo = process.env.CRON_EMAIL_TO || 'harsh@urvann.com';
  
  console.log('[Cron] 🔧 Manual trigger initiated');
  
  const result = await runCompleteProcess({
    emailTo,
    onProgress: (stage, message) => {
      console.log(`[Cron] [${stage.toUpperCase()}] ${message}`);
    },
  });

  if (result.success) {
    console.log(`[Cron] ✅ Manual trigger completed successfully`);
  } else {
    console.error(`[Cron] ❌ Manual trigger failed:`, result.errors);
  }
}
