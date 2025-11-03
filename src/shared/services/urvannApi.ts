import { UrvannFilter, UrvannProductsResponse } from '../types/api';

export class UrvannApiService {
  static async getProductCount(alias: string, substore: string): Promise<number> {
    try {
      // Call our proxy API endpoint
      const queryParams = new URLSearchParams({
        category: alias, // Pass alias as category parameter
        substore
      });

      // Add timeout (3 seconds max per request - should be much faster now with optimized route)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`/api/products/count?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.success ? data.total : 0;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      // Re-throw to allow retry logic in getAllProductCounts
      throw error;
    }
  }

  static async getAllProductCounts(
    aliases: string[], 
    substores: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Record<string, Record<string, number>>> {
    // NEW: Use cached endpoint for instant load!
    try {
      const totalRequests = aliases.length * substores.length;
      
      // Update progress if callback provided
      if (onProgress) {
        onProgress(0, totalRequests);
      }

      // Fetch from cache (INSTANT!)
      const queryParams = new URLSearchParams({
        categories: aliases.join(','),
        substores: substores.join(','),
      });

      const response = await fetch(`/api/products/count/cached?${queryParams}`, {
        method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
        // Update progress to 100% immediately
          if (onProgress) {
            onProgress(totalRequests, totalRequests);
          }
          return data.data;
        } else {
        throw new Error('Invalid response from cached endpoint');
      }
    } catch (error) {
      console.error('Error fetching cached counts:', error);
      // Return empty structure on error
      const results: Record<string, Record<string, number>> = {};
      for (const alias of aliases) {
        results[alias] = {};
        for (const substore of substores) {
          results[alias][substore] = 0;
        }
      }
      if (onProgress) {
        const totalRequests = aliases.length * substores.length;
        onProgress(totalRequests, totalRequests);
      }
      return results;
    }
  }

  // Trigger background refresh
  static async refreshProductCounts(
    aliases: string[],
    substores: string[]
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch('/api/products/count/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categories: aliases,
          substores: substores,
          mode: 'full'
        })
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error triggering refresh:', error);
      return { success: false, message: error.message };
    }
  }

  // Get cache status
  static async getCacheStatus(): Promise<any> {
    try {
      const response = await fetch('/api/products/count/cached', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'status' })
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error getting cache status:', error);
      return { success: false, message: error.message };
    }
  }
}
