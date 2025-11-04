import { NextResponse } from 'next/server';

// Configure route to allow longer execution time
export const maxDuration = 60; // 60 seconds max
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.urvann.com';
const ACCESS_KEY = '13945648c9da5fdbfc71e3a397218e75';

// ============================================================================
// OPTIMIZED CONFIGURATION WITH RATE LIMIT HANDLING
// Target: 4,200 requests in 30-60 seconds (respecting API rate limits)
// ============================================================================

// Adaptive concurrency settings - VERY CONSERVATIVE for extremely strict rate limits
const INITIAL_CONCURRENCY = 5;      // Start very low to avoid rate limits
const MAX_CONCURRENCY = 15;         // Keep it low
const MIN_CONCURRENCY = 3;          // Minimum fallback
const CONCURRENCY_INCREASE_STEP = 1; // Very gradual increase
const CONCURRENCY_DECREASE_STEP = 2; // Quick decrease on rate limits

// Retry configuration
const MAX_QUICK_RETRIES = 2;        // Quick retries for transient failures
const QUICK_RETRY_DELAY = 150;      // 150ms for quick retries

// Rate limit tracking
const RATE_LIMIT_THRESHOLD = 3;     // Reduce concurrency after 3 rate limits
const RATE_LIMIT_WINDOW = 5000;     // 5 second window for tracking

// Batch delay - always add delay to respect rate limits
const ADAPTIVE_BATCH_DELAY = 200;    // 200ms delay between batches
const RATE_LIMITED_DELAY = 1000;     // 1 second delay when rate limited

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  currentConcurrency: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  estimatedTimeRemaining: number;
}

class PerformanceTracker {
  private startTime: number;
  private completedRequests: number = 0;
  private responseTimes: number[] = [];
  private rateLimitHits: Array<{ timestamp: number }> = [];
  
  constructor(private totalRequests: number) {
    this.startTime = Date.now();
  }
  
  recordRequest(responseTime: number, wasRateLimited: boolean = false): void {
    this.completedRequests++;
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for rolling average
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    
    if (wasRateLimited) {
      this.rateLimitHits.push({ timestamp: Date.now() });
    }
  }
  
  getRecentRateLimits(): number {
    const now = Date.now();
    // Clean old entries
    this.rateLimitHits = this.rateLimitHits.filter(
      hit => now - hit.timestamp < RATE_LIMIT_WINDOW
    );
    return this.rateLimitHits.length;
  }
  
  getMetrics(currentConcurrency: number): PerformanceMetrics {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;
    
    const requestsPerSecond = this.completedRequests / elapsed;
    const remaining = this.totalRequests - this.completedRequests;
    const estimatedTimeRemaining = remaining / requestsPerSecond;
    
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.completedRequests,
      failedRequests: 0, // Updated separately
      rateLimitedRequests: this.rateLimitHits.length,
      currentConcurrency,
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 10) / 10,
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining * 10) / 10
    };
  }
  
  getProgress(): number {
    return Math.round((this.completedRequests / this.totalRequests) * 100);
  }
}

// ============================================================================
// OPTIMIZED API REQUEST WITH CONNECTION REUSE
// ============================================================================

interface ApiRequestResult {
  success: boolean;
  data?: any;
  wasRateLimited: boolean;
  responseTime: number;
  error?: string;
}

const makeOptimizedApiRequest = async (
  url: string,
  headers: Record<string, string>,
  retryCount: number = 0
): Promise<ApiRequestResult> => {
  const requestStart = Date.now();
  
  try {
    // Use fetch with keepalive for connection reuse
    const response = await fetch(url, {
      headers,
      keepalive: true, // Reuse connections
      signal: AbortSignal.timeout(10000), // 10s timeout per request
    });
    
    const responseTime = Date.now() - requestStart;
    
    // Handle rate limiting
    if (response.status === 429) {
      // Quick retry for rate limits
      if (retryCount < MAX_QUICK_RETRIES) {
        await delay(QUICK_RETRY_DELAY * (retryCount + 1));
        return makeOptimizedApiRequest(url, headers, retryCount + 1);
      }
      
      return {
        success: false,
        wasRateLimited: true,
        responseTime,
        error: 'rate_limited'
      };
    }
    
    // Handle other errors
    if (!response.ok) {
      return {
        success: false,
        wasRateLimited: false,
        responseTime,
        error: `HTTP ${response.status}`
      };
    }
    
    // Parse response
    const data = await response.json();
    
    return {
      success: true,
      data,
      wasRateLimited: false,
      responseTime: Date.now() - requestStart
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - requestStart;
    
    // Retry on network errors
    if (retryCount < MAX_QUICK_RETRIES) {
      await delay(QUICK_RETRY_DELAY);
      return makeOptimizedApiRequest(url, headers, retryCount + 1);
    }
    
    return {
      success: false,
      wasRateLimited: false,
      responseTime,
      error: error.message || 'Network error'
    };
  }
};

// ============================================================================
// PRODUCT COUNT FETCHER
// ============================================================================

interface ProductCountResult {
  category: string;
  substore: string;
  count: number;
  success: boolean;
  wasRateLimited: boolean;
  responseTime: number;
  error?: string;
}

const getProductCount = async (
  category: string,
  substore: string
): Promise<ProductCountResult> => {
  const slugifiedAlias = slugify(category);

    const filters = [
      { field: "categories", operator: "eq", value: slugifiedAlias },
      { field: "substore", operator: "eq", value: substore },
      { field: "publish", operator: "eq", value: "1" },
      { field: "inventory_quantity", operator: "gte", value: 1 }
    ];

  const queryParams = new URLSearchParams({
    fields: JSON.stringify({ sku: 1 }), // Minimal fields for speed
    limit: "1", // Only need count from paging.total
    start: "0",
    filters: JSON.stringify(filters)
  });

  const url = `${BASE_URL}/api/1.1/entity/ms.products?${queryParams}`;
  const headers = {
    'access-key': ACCESS_KEY,
    'Content-Type': 'application/json'
  };
  
  const result = await makeOptimizedApiRequest(url, headers);
  
  if (!result.success) {
    return {
      category,
      substore,
      count: 0,
      success: false,
      wasRateLimited: result.wasRateLimited,
      responseTime: result.responseTime,
      error: result.error
    };
  }
  
  const count = result.data?.paging?.total || 0;
  
  return {
    category,
    substore,
    count,
    success: true,
    wasRateLimited: false,
    responseTime: result.responseTime
  };
};

// ============================================================================
// ADAPTIVE CONCURRENCY CONTROLLER
// ============================================================================

class ConcurrencyController {
  private currentConcurrency: number;
  
  constructor() {
    this.currentConcurrency = INITIAL_CONCURRENCY;
  }
  
  getConcurrency(): number {
    return this.currentConcurrency;
    }
    
  adjustForRateLimits(recentRateLimits: number): boolean {
    if (recentRateLimits >= RATE_LIMIT_THRESHOLD) {
      const oldConcurrency = this.currentConcurrency;
      this.currentConcurrency = Math.max(
        MIN_CONCURRENCY,
        this.currentConcurrency - CONCURRENCY_DECREASE_STEP
      );
      
      if (this.currentConcurrency !== oldConcurrency) {
        console.log(
          `⚠️  Rate limits detected (${recentRateLimits}). ` +
          `Reducing concurrency: ${oldConcurrency} → ${this.currentConcurrency}`
        );
        return true;
      }
    }
    return false;
  }
  
  tryIncrease(recentRateLimits: number): void {
    // Only increase if no recent rate limits and not at max
    if (recentRateLimits === 0 && this.currentConcurrency < MAX_CONCURRENCY) {
      this.currentConcurrency = Math.min(
        MAX_CONCURRENCY,
        this.currentConcurrency + CONCURRENCY_INCREASE_STEP
      );
    }
  }
}

// ============================================================================
// MAIN BULK ENDPOINT
// ============================================================================

export async function POST(request: Request) {
  const overallStartTime = Date.now();
  
  console.log('🔥 BULK API ENDPOINT HIT - Starting processing...');
  
  try {
    const body = await request.json();
    const { categories, substores } = body;

    console.log(`📥 Received request: ${categories?.length || 0} categories, ${substores?.length || 0} substores`);
    
    // Validation
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Categories array is required' },
        { status: 400 }
      );
    }

    if (!substores || !Array.isArray(substores) || substores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Substores array is required' },
        { status: 400 }
      );
    }

    // Generate all combinations
    const combinations: Array<{ category: string; substore: string }> = [];
    for (const category of categories) {
      for (const substore of substores) {
        combinations.push({ category, substore });
      }
    }

    const totalRequests = combinations.length;
    
    console.log('\n' + '='.repeat(80));
    console.log('🚀 BULK PRODUCT COUNT REQUEST STARTED');
    console.log('='.repeat(80));
    console.log(`📊 Total requests: ${totalRequests}`);
    console.log(`📦 Categories: ${categories.length}`);
    console.log(`🏪 Substores: ${substores.length}`);
    console.log(`⚡ Initial concurrency: ${INITIAL_CONCURRENCY}`);
    console.log(`🎯 Target time: 30-60 seconds (respecting API rate limits)`);
    console.log('='.repeat(80) + '\n');
    
    // Initialize tracking
    const tracker = new PerformanceTracker(totalRequests);
    const concurrencyController = new ConcurrencyController();
    
    // Results storage
    const results: Record<string, Record<string, number>> = {};
    for (const category of categories) {
      results[category] = {};
    }

    // Failed requests for retry
    const failedRequests: Array<{ category: string; substore: string }> = [];
    
    // Process in adaptive batches
    let batchNumber = 0;
    let consecutiveSuccessfulBatches = 0;
    
    for (let i = 0; i < combinations.length; i += concurrencyController.getConcurrency()) {
      batchNumber++;
      const currentConcurrency = concurrencyController.getConcurrency();
      const batch = combinations.slice(i, i + currentConcurrency);
      const batchStartTime = Date.now();
      
      // Execute batch with full concurrency
      const batchPromises = batch.map(({ category, substore }) =>
        getProductCount(category, substore)
      );

      const batchResults = await Promise.all(batchPromises);
      
      // Process results
      let batchRateLimits = 0;
      let batchSuccesses = 0;
      
      batchResults.forEach((result) => {
        tracker.recordRequest(result.responseTime, result.wasRateLimited);
        
        if (result.success) {
          results[result.category][result.substore] = result.count;
          batchSuccesses++;
        } else {
          if (result.wasRateLimited) {
            batchRateLimits++;
          }
          // Track for potential retry
          failedRequests.push({
            category: result.category,
            substore: result.substore
          });
        }
      });
      
      const batchTime = Date.now() - batchStartTime;
      
      // Adjust concurrency based on rate limits
      const recentRateLimits = tracker.getRecentRateLimits();
      const wasAdjusted = concurrencyController.adjustForRateLimits(recentRateLimits);
      
      // Try to increase if doing well
      if (batchRateLimits === 0) {
        consecutiveSuccessfulBatches++;
        if (consecutiveSuccessfulBatches >= 3) {
          concurrencyController.tryIncrease(recentRateLimits);
          consecutiveSuccessfulBatches = 0;
        }
      } else {
        consecutiveSuccessfulBatches = 0;
      }
      
      // Get metrics
      const metrics = tracker.getMetrics(currentConcurrency);
      const progress = tracker.getProgress();
      
      // Log progress every batch
      console.log(
        `📦 Batch ${batchNumber} | ` +
        `✅ ${batchSuccesses}/${batch.length} | ` +
        `⚡ ${currentConcurrency} concurrent | ` +
        `⏱️  ${batchTime}ms | ` +
        `📊 ${progress}% (${metrics.successfulRequests}/${totalRequests}) | ` +
        `🚀 ${metrics.requestsPerSecond} req/s | ` +
        `⏳ ETA: ${metrics.estimatedTimeRemaining}s` +
        (batchRateLimits > 0 ? ` | ⚠️  ${batchRateLimits} rate limited` : '')
      );
      
      // Always add delay between batches to respect rate limits
      if (i + currentConcurrency < combinations.length) {
        const delayTime = batchRateLimits > 0 ? RATE_LIMITED_DELAY : ADAPTIVE_BATCH_DELAY;
        await delay(delayTime);
      }
    }
    
    // Retry failed requests if we have time and there aren't too many
    const elapsedSoFar = (Date.now() - overallStartTime) / 1000;
    if (failedRequests.length > 0 && failedRequests.length < 100 && elapsedSoFar < 9) {
      console.log(`\n🔄 Retrying ${failedRequests.length} failed requests...`);
      
      const retryResults = await Promise.all(
        failedRequests.map(({ category, substore }) =>
          getProductCount(category, substore)
        )
      );
      
      let retrySuccesses = 0;
      retryResults.forEach((result) => {
        if (result.success) {
          results[result.category][result.substore] = result.count;
          retrySuccesses++;
        }
      });
      
      console.log(`✅ Retry complete: ${retrySuccesses}/${failedRequests.length} recovered`);
    }
    
    // Final metrics
    const totalTime = ((Date.now() - overallStartTime) / 1000).toFixed(2);
    const finalMetrics = tracker.getMetrics(concurrencyController.getConcurrency());
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ BULK REQUEST COMPLETED');
    console.log('='.repeat(80));
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`📊 Requests: ${finalMetrics.successfulRequests}/${totalRequests}`);
    console.log(`🚀 Average rate: ${finalMetrics.requestsPerSecond} req/s`);
    console.log(`⚡ Avg response time: ${finalMetrics.avgResponseTime}ms`);
    console.log(`⚠️  Rate limits encountered: ${finalMetrics.rateLimitedRequests}`);
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({
      success: true,
      data: results,
      stats: {
        total: totalRequests,
        successful: finalMetrics.successfulRequests,
        failed: totalRequests - finalMetrics.successfulRequests,
        rateLimited: finalMetrics.rateLimitedRequests,
        timeElapsed: `${totalTime}s`,
        averageRate: `${finalMetrics.requestsPerSecond} req/s`,
        averageResponseTime: `${finalMetrics.avgResponseTime}ms`
      }
    });

  } catch (error: any) {
    console.error('❌ Error in bulk product count:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch product counts',
        error: error.message
      },
      { status: 500 }
    );
  }
}
