/**
 * Modular service for pushing frequently bought together updates
 * Can be used by both API routes and cron jobs
 */

import { getCollection } from '@/lib/mongodb';
import { updateProductFrequentlyBought } from '@/lib/urvannApi';

export interface PushOptions {
  allSkus: Array<{ sku: string; name: string; substore?: string }>;
  limit?: number;
  manualSkusByHub?: Record<string, string[]>;
  allMappingsCache?: Record<string, { product_id: string; publish: string; inventory: number; substore?: string }>;
  onProgress?: (progress: PushProgress) => void;
  abortSignal?: AbortSignal;
}

export interface PushProgress {
  processed: number;
  total: number;
  current: { sku: string; name: string } | null;
  successes: string[];
  failures: Array<{ sku: string; productId: string; error: string }>;
  logs: string[];
}

export interface PushResult {
  success: boolean;
  totalSkus: number;
  successful: number;
  failed: number;
  elapsedTime: number;
  errors: Array<{ sku: string; productId: string; error: string }>;
  logs: string[];
}

/**
 * Push frequently bought together updates for all SKUs
 * This is the main entry point that handles batching internally
 */
export async function pushAllUpdates(options: PushOptions): Promise<PushResult> {
  const startTime = Date.now();
  const {
    allSkus,
    limit = 6,
    manualSkusByHub = {},
    allMappingsCache,
    onProgress,
    abortSignal,
  } = options;

  const result: PushResult = {
    success: true,
    totalSkus: allSkus.length,
    successful: 0,
    failed: 0,
    elapsedTime: 0,
    errors: [],
    logs: [],
  };

  try {
    // Process in batches to avoid memory issues
    // OPTIMIZATION: Increased batch size from 50 to 200 for 4x speed improvement
    const BATCH_SIZE = 200;
    let processedCount = 0;

    for (let startIndex = 0; startIndex < allSkus.length; startIndex += BATCH_SIZE) {
      // Check for abort signal
      if (abortSignal?.aborted) {
        result.logs.push('Push cancelled by user');
        break;
      }

      const endIndex = Math.min(startIndex + BATCH_SIZE, allSkus.length);
      const batchSkus = allSkus.slice(startIndex, endIndex);

      // Call the batch push API internally
      const batchResult = await pushBatch({
        startIndex,
        batchSize: BATCH_SIZE,
        allSkus,
        limit,
        manualSkusByHub,
        allMappingsCache,
        abortSignal,
      });

      // Accumulate results
      result.successful += batchResult.successes.length;
      result.failed += batchResult.failures.length;
      result.errors.push(...batchResult.failures);
      result.logs.push(...batchResult.logs);
      processedCount += batchResult.processed;

      // Report progress
      if (onProgress) {
        onProgress({
          processed: processedCount,
          total: allSkus.length,
          current: batchResult.current,
          successes: batchResult.successes,
          failures: batchResult.failures,
          logs: batchResult.logs,
        });
      }
    }

    result.elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    result.logs.push(`✓ Push completed: ${result.successful} successful, ${result.failed} failed`);
    
    return result;
  } catch (error) {
    result.success = false;
    result.elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    result.logs.push(`✗ Push failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Push updates for a single batch of SKUs
 * This is the core logic extracted from the API route
 */
async function pushBatch(options: {
  startIndex: number;
  batchSize: number;
  allSkus: Array<{ sku: string; name: string; substore?: string }>;
  limit: number;
  manualSkusByHub: Record<string, string[]>;
  allMappingsCache?: Record<string, { product_id: string; publish: string; inventory: number; substore?: string }>;
  abortSignal?: AbortSignal;
}): Promise<{
  processed: number;
  current: { sku: string; name: string } | null;
  successes: string[];
  failures: Array<{ sku: string; productId: string; error: string }>;
  logs: string[];
}> {
  // Import the batch push logic from the API route
  // For now, we'll call the API route internally
  // In a more modular setup, we could extract the logic further
  
  const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/frequently-bought/push-all-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startIndex: options.startIndex,
      batchSize: options.batchSize,
      allSkus: options.allSkus,
      limit: options.limit,
      manualSkusByHub: options.manualSkusByHub,
      allMappingsCache: options.allMappingsCache,
    }),
    signal: options.abortSignal,
  });

  if (!response.ok) {
    throw new Error(`Batch push failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    processed: data.progress?.processed || 0,
    current: data.progress?.current || null,
    successes: data.progress?.successes || [],
    failures: data.progress?.failures || [],
    logs: data.progress?.logs || [],
  };
}
