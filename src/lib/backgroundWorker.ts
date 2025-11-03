/**
 * Background Worker - Auto-starts on server initialization
 * Continuously updates product counts in MongoDB
 */

import { connectDB } from './mongodb';
import mongoose from 'mongoose';

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// Worker configuration
const INITIAL_BATCH_SIZE = 2; // Start with 2 concurrent requests (reduced for stability)
const MIN_BATCH_SIZE = 1; // Minimum concurrent requests (reduced for stability)
const MAX_BATCH_SIZE = 2; // Maximum concurrent requests (reduced for stability)
const BATCH_DELAY = 300; // 300ms between batches (increased for stability)
const MAX_RETRIES = 3; // Max retries for rate limit errors
const RETRY_DELAY = 3000; // 3 seconds wait after rate limit (increased for stability)

// Adaptive rate limiting
let currentBatchSize = INITIAL_BATCH_SIZE;
let consecutiveSuccesses = 0;
let consecutiveFailures = 0;

let isWorkerRunning = false;

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Fetch product count with pagination and retry logic
async function fetchProductCount(category: string, substore: string, retryCount = 0): Promise<number> {
  const categoryAlias = category;
  
  const filters = [
    { field: "categories", operator: "eq", value: categoryAlias },
    { field: "substore", operator: "eq", value: substore },
    { field: "publish", operator: "eq", value: "1" },
    { field: "inventory_quantity", operator: "gt", value: 0 }
  ];
  
  let totalCount = 0;
  let start = 0;
  const limit = 500;
  let pageNumber = 0;
  
  try {
    while (true) {
      pageNumber++;
      
      const queryParams = new URLSearchParams({
        fields: JSON.stringify({ sku: 1 }),
        limit: limit.toString(),
        start: start.toString(),
        filters: JSON.stringify(filters)
      });
      
      const apiUrl = `${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'access-key': ACCESS_KEY,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000),
      });
      
      // Handle 429 rate limit with retry
      if (response.status === 429) {
        if (retryCount < MAX_RETRIES) {
          console.log(`[Worker] Rate limited ${categoryAlias}-${substore}, waiting ${RETRY_DELAY}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
          await delay(RETRY_DELAY);
          return fetchProductCount(category, substore, retryCount + 1);
        } else {
          console.error(`[Worker] Max retries reached for ${categoryAlias}-${substore}, skipping`);
          return totalCount;
        }
      }
      
      if (!response.ok) {
        console.error(`[Worker] Failed to fetch ${categoryAlias}-${substore}: ${response.status}`);
        return totalCount;
      }
      
      const data = await response.json();
      const returnedCount = data.data?.length || 0;
      
      totalCount += returnedCount;
      
      if (returnedCount < limit) {
        break;
      }
      
      start += limit;
      
      if (pageNumber >= 20) {
        break;
      }
    }
    
    return totalCount;
  } catch (error: any) {
    console.error(`[Worker] Error fetching ${category}-${substore}:`, error.message);
    return 0;
  }
}

// Update all product counts
async function updateAllCounts() {
  try {
    await connectDB();
    
    // Import models
    const { CategoryModel } = await import('@/models/category');
    const ProductCount = (await import('@/models/ProductCount')).default;
    
    // Get all categories from MongoDB using CategoryModel
    const categories = await CategoryModel.findAll();
    const substores = [
      'bgl-e', 'bgl-e2', 'bgl-n', 'bgl-n2', 'bgl-s1', 'bgl-s2',
      'bgl-w1', 'bgl-w2', 'noi', 'ghaziabad', 'sdel', 'sdelhi',
      'rohini', 'roh', 'uttam', 'dwarka', 'dncr', 'gurugram',
      'greaternoida', 'kalkaji', 'vasantkunj'
    ];
    
    const combinations: Array<{ category: string; substore: string }> = [];
    for (const category of categories) {
      // Only process published categories
      if (category.publish) {
        for (const substore of substores) {
          combinations.push({ category: category.alias, substore });
        }
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 WORKER: Starting update cycle`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📦 Total combinations: ${combinations.length}`);
    console.log(`⚡ Initial batch size: ${currentBatchSize} concurrent requests`);
    console.log(`⏱️  Started at: ${new Date().toLocaleTimeString()}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const startTime = Date.now();
    
    let updated = 0;
    let failed = 0;
    let rateLimited = 0;
    
    // Reset adaptive counters
    consecutiveSuccesses = 0;
    consecutiveFailures = 0;
    
    // Process in adaptive batches
    for (let i = 0; i < combinations.length; i += currentBatchSize) {
      const batch = combinations.slice(i, i + currentBatchSize);
      
      const batchPromises = batch.map(async ({ category, substore }) => {
        try {
          const count = await fetchProductCount(category, substore);
          
          // Update or create in database
          await ProductCount.findOneAndUpdate(
            { category, substore },
            {
              category,
              substore,
              count,
              lastUpdated: new Date(),
              isStale: false,
            },
            { upsert: true, new: true }
          );
          
          return { success: true, rateLimited: false };
        } catch (error: any) {
          const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
          // Silent error handling - errors are counted in progress logs
          return { success: false, rateLimited: isRateLimit };
        }
      });
      
      const results = await Promise.all(batchPromises);
      
      let batchSuccesses = 0;
      let batchFailures = 0;
      let batchRateLimited = 0;
      
      results.forEach(result => {
        if (result.success) {
          updated++;
          batchSuccesses++;
        } else {
          failed++;
          batchFailures++;
          if (result.rateLimited) {
            rateLimited++;
            batchRateLimited++;
          }
        }
      });
      
      // Adaptive rate limiting logic
      if (batchRateLimited > 0) {
        // Got rate limited - slow down
        consecutiveFailures++;
        consecutiveSuccesses = 0;
        
        if (currentBatchSize > MIN_BATCH_SIZE) {
          currentBatchSize = Math.max(MIN_BATCH_SIZE, currentBatchSize - 1);
          console.log(`[Worker] ⚠️  Rate limited! Reducing to ${currentBatchSize} concurrent requests`);
        }
      } else if (batchSuccesses === batch.length) {
        // All succeeded - can speed up
        consecutiveSuccesses++;
        consecutiveFailures = 0;
        
        // After 20 successful batches, try to increase speed (more conservative)
        if (consecutiveSuccesses >= 20 && currentBatchSize < MAX_BATCH_SIZE) {
          currentBatchSize = Math.min(MAX_BATCH_SIZE, currentBatchSize + 1);
          console.log(`[Worker] ⚡ Increasing to ${currentBatchSize} concurrent requests`);
          consecutiveSuccesses = 0;
        }
      }
      
      // Log progress every 20 combinations
      if ((i + currentBatchSize) % 20 === 0 || i + currentBatchSize >= combinations.length) {
        const progress = Math.min(((i + currentBatchSize) / combinations.length) * 100, 100).toFixed(1);
        const elapsedSec = ((Date.now() - startTime) / 1000);
        const rate = ((updated + failed) / elapsedSec).toFixed(1);
        const elapsedMin = (elapsedSec / 60).toFixed(1);
        const eta = ((combinations.length - (updated + failed)) / parseFloat(rate) / 60).toFixed(1);
        
        console.log(
          `📊 Progress: ${progress}% | ` +
          `✅ ${updated} | ❌ ${failed} | ⚠️  ${rateLimited} | ` +
          `⏱️  ${elapsedMin}m | ETA: ${eta}m | ⚡ ${currentBatchSize} concurrent`
        );
      }
      
      // Add delay between batches
      if (i + currentBatchSize < combinations.length) {
        await delay(BATCH_DELAY);
      }
    }
    
    const elapsedSec = ((Date.now() - startTime) / 1000);
    const elapsedMin = (elapsedSec / 60).toFixed(2);
    const avgRate = ((updated + failed) / elapsedSec).toFixed(1);
    const successRate = ((updated / (updated + failed)) * 100).toFixed(1);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ WORKER: Update cycle complete`);
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Rate limited: ${rateLimited}`);
    console.log(`📊 Success rate: ${successRate}%`);
    console.log(`⏱️  Total time: ${elapsedMin} minutes`);
    console.log(`⚡ Average rate: ${avgRate} req/s`);
    console.log(`🔄 Final batch size: ${currentBatchSize} concurrent`);
    console.log(`🔄 Starting next cycle immediately...`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Start next cycle immediately after completion
    if (isWorkerRunning) {
      // Small delay to prevent stack overflow and allow event loop to breathe
      await delay(1000);
      updateAllCounts();
    }
    
  } catch (error: any) {
    console.error('[Worker] Error in update cycle:', error.message);
    
    // Continue running even on error - restart after a short delay
    if (isWorkerRunning) {
      console.log('[Worker] 🔄 Restarting after error in 5 seconds...');
      await delay(5000);
      if (isWorkerRunning) {
        updateAllCounts();
      }
    }
  }
}

// Start the background worker
export async function startBackgroundWorker() {
  if (isWorkerRunning) {
    console.log('[Worker] Already running, skipping...');
    return;
  }
  
  isWorkerRunning = true;
  console.log('[Worker] 🚀 Background worker starting...');
  console.log('[Worker] ✅ Worker will run continuously (starting next cycle immediately after completion)');
  
  // Run immediately on start - it will continuously loop after completion
  updateAllCounts();
}

// Stop the background worker
export function stopBackgroundWorker() {
  isWorkerRunning = false;
  console.log('[Worker] 🛑 Background worker stopped (will stop after current cycle completes)');
}

// Auto-start in development
if (process.env.NODE_ENV === 'development') {
  // Start after a short delay to allow server to initialize
  setTimeout(() => {
    startBackgroundWorker();
  }, 5000); // 5 second delay
}

