/**
 * Modular service for syncing SKU to product_id mappings
 * Can be used by both API routes and cron jobs
 */

export interface SyncOptions {
  onProgress?: (progress: SyncProgress) => void;
  abortSignal?: AbortSignal;
}

export interface SyncProgress {
  processed: number;
  total: number;
  currentBatch: number | null;
  logs: string[];
  successes: number;
  failures: number;
  elapsedTime: number;
}

export interface SyncResult {
  success: boolean;
  totalSynced: number;
  elapsedTime: number;
  logs: string[];
}

/**
 * Sync SKU to product_id mappings from Urvann API
 */
export async function syncMappings(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const { onProgress, abortSignal } = options;

  const result: SyncResult = {
    success: true,
    totalSynced: 0,
    elapsedTime: 0,
    logs: ['Starting sync mapping...'],
  };

  try {
    // OPTIMIZATION: Increased batch size from 500 to 1000 for faster syncing
    const batchSize = 1000;
    let sinceId = '0';
    let hasMore = true;
    let isFirstBatch = true;
    let consecutiveEmpty = 0;
    const MAX_CONSECUTIVE_EMPTY = 5;
    const MAX_BATCHES = 500;
    let batchCount = 0;

    while (hasMore && consecutiveEmpty < MAX_CONSECUTIVE_EMPTY && batchCount < MAX_BATCHES) {
      // Check for abort signal
      if (abortSignal?.aborted) {
        result.logs.push('Sync cancelled by user');
        break;
      }

      try {
        batchCount++;
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/frequently-bought/sync-mapping-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sinceId,
            batchSize,
            isFirstBatch,
          }),
          signal: abortSignal,
        });

        if (abortSignal?.aborted) {
          result.logs.push('Sync cancelled by user');
          break;
        }

        const batchResult = await response.json();

        if (abortSignal?.aborted) {
          result.logs.push('Sync cancelled by user');
          break;
        }

        if (batchResult.success) {
          result.totalSynced += batchResult.progress.successes;
          
          const progress: SyncProgress = {
            processed: result.totalSynced,
            total: 150000, // Expected total
            currentBatch: batchCount,
            logs: batchResult.progress.logs || [],
            successes: batchResult.progress.successes || 0,
            failures: batchResult.progress.failures || 0,
            elapsedTime: Math.floor((Date.now() - startTime) / 1000),
          };

          if (onProgress) {
            onProgress(progress);
          }

          result.logs.push(...(batchResult.progress.logs || []));

          const newSinceId = batchResult.nextSinceId || sinceId;

          if (batchResult.progress.processed === 0) {
            consecutiveEmpty++;
            if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
              result.logs.push('No more products found, sync complete');
              hasMore = false;
            } else {
              sinceId = newSinceId;
              hasMore = true;
            }
          } else {
            consecutiveEmpty = 0;
            hasMore = true;
            sinceId = newSinceId;
          }

          isFirstBatch = false;
        } else {
          if (batchResult.error?.includes('406')) {
            result.logs.push('Reached API pagination limit (406), sync complete');
            hasMore = false;
          } else {
            result.logs.push(`Error: ${batchResult.error || batchResult.message}`);
            consecutiveEmpty++;
            if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
              hasMore = false;
            }
          }
        }
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          result.logs.push('Sync cancelled by user');
          break;
        } else {
          result.logs.push(`Error: ${fetchError}`);
          consecutiveEmpty++;
          if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
            hasMore = false;
          }
        }
      }
    }

    if (batchCount >= MAX_BATCHES) {
      result.logs.push(`⚠ Reached maximum batch limit (${MAX_BATCHES}), stopping sync`);
    }

    result.elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    result.logs.push(`✓ Sync completed! Total synced: ${result.totalSynced.toLocaleString()} products`);
    result.success = true;

    return result;
  } catch (error) {
    result.success = false;
    result.elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    result.logs.push(`✗ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}
