/**
 * Orchestrator service for running the complete frequently bought together update process
 * Handles: Sync mappings → Fetch all SKUs → Push updates → Send email
 */

import { syncMappings, SyncResult } from './frequentlyBoughtSyncService';
import { pushAllUpdates, PushResult } from './frequentlyBoughtPushService';
import { sendEmail, formatPushStatsEmail } from '@/lib/email';
import { getCollection } from '@/lib/mongodb';

export interface OrchestratorOptions {
  manualSkusByHub?: Record<string, string[]>;
  emailTo?: string;
  onProgress?: (stage: string, message: string) => void;
  abortSignal?: AbortSignal;
}

export interface OrchestratorResult {
  success: boolean;
  syncResult?: SyncResult;
  pushResult?: PushResult;
  emailSent: boolean;
  totalTime: number;
  errors: string[];
}

/**
 * Run the complete process: Sync → Push → Email
 */
export async function runCompleteProcess(
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const {
    manualSkusByHub = {},
    emailTo = 'harsh@urvann.com',
    onProgress,
    abortSignal,
  } = options;

  const result: OrchestratorResult = {
    success: false,
    emailSent: false,
    totalTime: 0,
    errors: [],
  };

  try {
    // Stage 1: Sync Mappings
    if (onProgress) onProgress('sync', 'Starting sync mappings...');
    
    const syncResult = await syncMappings({
      onProgress: (progress) => {
        if (onProgress) {
          onProgress('sync', `Synced ${progress.processed.toLocaleString()} products...`);
        }
      },
      abortSignal,
    });

    result.syncResult = syncResult;

    if (!syncResult.success) {
      result.errors.push('Sync failed');
      result.totalTime = Math.floor((Date.now() - startTime) / 1000);
      return result;
    }

    if (onProgress) onProgress('sync', `✓ Sync completed: ${syncResult.totalSynced.toLocaleString()} products`);

    // Stage 2: Fetch All SKUs
    if (onProgress) onProgress('fetch', 'Fetching all SKUs...');
    
    const allSkus = await fetchAllSkus();
    
    if (allSkus.length === 0) {
      result.errors.push('No SKUs found to push');
      result.totalTime = Math.floor((Date.now() - startTime) / 1000);
      return result;
    }

    if (onProgress) onProgress('fetch', `✓ Found ${allSkus.length.toLocaleString()} SKUs`);

    // Stage 3: Push Updates
    if (onProgress) onProgress('push', 'Starting push updates...');
    
    const pushResult = await pushAllUpdates({
      allSkus,
      limit: 6,
      manualSkusByHub,
      onProgress: (progress) => {
        if (onProgress) {
          onProgress('push', `Pushed ${progress.processed}/${progress.total} SKUs...`);
        }
      },
      abortSignal,
    });

    result.pushResult = pushResult;

    if (!pushResult.success) {
      result.errors.push('Push failed');
    }

    if (onProgress) {
      onProgress('push', `✓ Push completed: ${pushResult.successful} successful, ${pushResult.failed} failed`);
    }

    // Stage 4: Send Email
    if (onProgress) onProgress('email', 'Sending email notification...');
    
    const emailResult = await sendEmail({
      to: emailTo,
      subject: `Frequently Bought Together Update - ${pushResult.successful} Successful, ${pushResult.failed} Failed`,
      html: formatPushStatsEmail({
        totalSkus: pushResult.totalSkus,
        successful: pushResult.successful,
        failed: pushResult.failed,
        elapsedTime: pushResult.elapsedTime,
        errors: pushResult.errors,
      }),
    });

    result.emailSent = emailResult.success;
    if (!emailResult.success) {
      result.errors.push(`Email failed: ${emailResult.error}`);
    }

    if (onProgress) {
      onProgress('email', emailResult.success ? '✓ Email sent successfully' : '✗ Email failed');
    }

    result.success = pushResult.success && emailResult.success;
    result.totalTime = Math.floor((Date.now() - startTime) / 1000);

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    result.totalTime = Math.floor((Date.now() - startTime) / 1000);
    return result;
  }
}

/**
 * Fetch all SKUs from the mapping collection
 */
async function fetchAllSkus(): Promise<Array<{ sku: string; name: string; substore?: string }>> {
  const mappingCollection = await getCollection('skuProductMapping');
  
  const mappings = await mappingCollection.find(
    { substore: { $nin: ['hubchange', 'test4'] } },
    { projection: { sku: 1, name: 1, substore: 1, _id: 0 } }
  ).toArray();

  return mappings.map((m: any) => ({
    sku: m.sku as string,
    name: (m.name as string) || m.sku,
    substore: Array.isArray(m.substore) ? m.substore[0] : (m.substore as string),
  }));
}
