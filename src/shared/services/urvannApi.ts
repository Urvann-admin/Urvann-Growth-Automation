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
    // Use the consolidated bulk endpoint - ONE API call instead of hundreds!
    try {
      const totalRequests = aliases.length * substores.length;
      
      // Update progress if callback provided
      if (onProgress) {
        // Simulate progress for better UX (server will handle the actual work)
        onProgress(0, totalRequests);
      }

      // Add timeout for bulk request (60 seconds should be enough for thousands of combinations)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch('/api/products/count/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            categories: aliases,
            substores: substores
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          // Update progress to 100% on success
          if (onProgress) {
            onProgress(totalRequests, totalRequests);
          }
          return data.data;
        } else {
          throw new Error('Invalid response from bulk endpoint');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error in bulk product count fetch:', error);
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
}
